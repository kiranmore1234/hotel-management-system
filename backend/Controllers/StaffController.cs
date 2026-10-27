using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using Bramhand.Api.Data;
using Bramhand.Api.Models;
using Bramhand.Api.Models.Entities;
using Bramhand.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Roles = RoleNames.AdminOrManager)]
public class StaffController(AppDbContext db, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetStaff()
    {
        var staff = await db.Users
            .Where(user => user.Role != UserRole.Admin)
            .OrderBy(user => user.Role)
            .ThenBy(user => user.Name)
            .Select(user => new StaffDto(user.Id, user.Name, user.Username, user.Phone, user.JobTitle ?? user.Role.ToString(), user.IsActive))
            .ToListAsync();
        return Ok(staff);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest request)
    {
        var (role, jobTitle) = ParseStaffRole(request.Role);
        if (role is null)
            return BadRequest(new { message = "Provide a valid staff role. Admin cannot be assigned to staff accounts." });
        if (request.InitialAttendance is not null &&
            (request.AttendanceDate is null || !IsAttendanceStatus(request.InitialAttendance)))
            return BadRequest(new { message = "Choose a valid attendance date and status" });

        var username = request.Username.Trim();
        if (await db.Users.AnyAsync(user => user.Username == username))
            return Conflict(new { message = "That username is already in use" });

        var temporaryPassword = string.IsNullOrWhiteSpace(request.Password)
            ? Convert.ToBase64String(RandomNumberGenerator.GetBytes(24))
            : request.Password;
        var user = new User
        {
            Name = request.Name.Trim(),
            Username = username,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            JobTitle = jobTitle,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword),
            PinHash = string.IsNullOrWhiteSpace(request.Pin) ? null : BCrypt.Net.BCrypt.HashPassword(request.Pin),
            Role = role.Value,
        };
        db.Users.Add(user);
        if (request.InitialAttendance is not null && request.AttendanceDate is { } attendanceDate)
        {
            var attendance = new StaffAttendance
            {
                User = user,
                WorkDate = attendanceDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                Status = request.InitialAttendance,
                CheckIn = request.InitialAttendance is "Present" or "Half day" ? DateTime.UtcNow : null,
                RecordedByUserId = User.GetUserId(),
            };
            db.StaffAttendance.Add(attendance);
        }
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_CREATE", $"Created {user.JobTitle ?? user.Role.ToString()} account {user.Username}");
        return Ok(ToStaffDto(user) with { TemporaryPassword = temporaryPassword });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<IActionResult> UpdateStaff(int id, [FromBody] UpdateStaffRequest request)
    {
        var (role, jobTitle) = ParseStaffRole(request.Role);
        if (role is null)
            return BadRequest(new { message = "Provide a valid staff role. Admin cannot be assigned to staff accounts." });

        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == id && user.Role != UserRole.Admin);
        if (user is null) return NotFound();

        var username = request.Username.Trim();
        if (await db.Users.AnyAsync(other => other.Id != id && other.Username == username))
            return Conflict(new { message = "That username is already in use" });

        user.Name = request.Name.Trim();
        user.Username = username;
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.Role = role.Value;
        user.JobTitle = jobTitle;
        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        if (!string.IsNullOrWhiteSpace(request.Pin))
            user.PinHash = BCrypt.Net.BCrypt.HashPassword(request.Pin);

        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_UPDATE", $"Updated staff account {user.Username}");
        return Ok(ToStaffDto(user));
    }

    [HttpPut("{id:int}/active")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> SetStaffActive(int id, [FromBody] SetStaffActiveRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == id && user.Role != UserRole.Admin);
        if (user is null) return NotFound();

        user.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_STATUS", $"Set {user.Username} active={user.IsActive}");
        return Ok(ToStaffDto(user));
    }

    [HttpPost("{id:int}/password-reset")]
    [Authorize(Roles = RoleNames.AdminOrManager)]
    public async Task<IActionResult> ResetStaffPassword(int id)
    {
        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == id && user.Role != UserRole.Admin);
        if (user is null) return NotFound();

        var temporaryPassword = Convert.ToBase64String(RandomNumberGenerator.GetBytes(24));
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword);
        user.PinHash = null;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_PASSWORD_RESET", $"Reset password for staff account {user.Username}");
        return Ok(new { temporaryPassword });
    }

    [HttpGet("attendance")]
    public async Task<IActionResult> GetAttendance(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? name,
        [FromQuery] DateOnly? date)
    {
        var fromDate = from ?? date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var toDate = to ?? date ?? fromDate;
        if (fromDate > toDate)
            return BadRequest(new { message = "The start date must be on or before the end date" });

        var start = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var end = toDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var records = db.StaffAttendance
            .AsNoTracking()
            .Include(record => record.User)
            .Where(record => record.WorkDate >= start && record.WorkDate <= end);

        if (!string.IsNullOrWhiteSpace(name))
        {
            var search = name.Trim();
            records = records.Where(record =>
                record.User.Name.Contains(search) || record.User.Username.Contains(search));
        }

        var result = await records
            .OrderByDescending(record => record.WorkDate)
            .ThenBy(record => record.User.Name)
            .Select(record => new AttendanceDto(
                record.UserId,
                record.User.Name,
                record.User.Username,
                record.User.JobTitle ?? record.User.Role.ToString(),
                DateOnly.FromDateTime(record.WorkDate),
                record.Status,
                record.CheckIn,
                record.CheckOut,
                record.Notes))
            .ToListAsync();

        return Ok(result);
    }

    [HttpPut("attendance")]
    public async Task<IActionResult> SetAttendance([FromBody] SetAttendanceRequest request)
    {
        if (request.WorkDate == default)
            return BadRequest(new { message = "Choose a valid attendance date" });
        if (!IsAttendanceStatus(request.Status))
            return BadRequest(new { message = "Attendance status must be Present, Absent, Leave, or Half day" });

        var user = await db.Users.FirstOrDefaultAsync(user =>
            user.Id == request.UserId && user.IsActive && user.Role != UserRole.Admin);
        if (user is null) return NotFound(new { message = "Active staff member not found" });

        var workDate = request.WorkDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var record = await db.StaffAttendance.FirstOrDefaultAsync(item =>
            item.UserId == user.Id && item.WorkDate == workDate);
        if (record is null)
        {
            record = new StaffAttendance
            {
                UserId = user.Id,
                WorkDate = workDate,
                RecordedByUserId = User.GetUserId(),
            };
            db.StaffAttendance.Add(record);
        }

        record.Status = request.Status;
        record.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        record.RecordedByUserId = User.GetUserId();
        if (request.Status is "Absent" or "Leave")
        {
            record.CheckIn = null;
            record.CheckOut = null;
        }
        else
        {
            record.CheckIn ??= DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_ATTENDANCE", $"{user.Username} {request.Status} on {request.WorkDate}");
        return Ok(new AttendanceDto(user.Id, user.Name, user.Username, user.JobTitle ?? user.Role.ToString(), request.WorkDate, record.Status, record.CheckIn, record.CheckOut, record.Notes));
    }

    private static (UserRole? Role, string? JobTitle) ParseStaffRole(string value)
    {
        var normalized = value.Trim();
        if (normalized.Length < 2)
            return (null, null);
        if (normalized.Equals("Caption", StringComparison.OrdinalIgnoreCase))
            normalized = nameof(UserRole.Captain);
        if (Enum.TryParse<UserRole>(normalized, true, out var role) && Enum.IsDefined(role))
            return role == UserRole.Admin ? (null, null) : (role, null);

        return (UserRole.Waiter, normalized);
    }

    private static StaffDto ToStaffDto(User user)
        => new(user.Id, user.Name, user.Username, user.Phone, user.JobTitle ?? user.Role.ToString(), user.IsActive);

    private static bool IsAttendanceStatus(string status)
        => status is "Present" or "Absent" or "Leave" or "Half day";
}

public record StaffDto(
    int Id,
    string Name,
    string Username,
    string? Phone,
    string Role,
    bool IsActive,
    string? TemporaryPassword = null);

public record AttendanceDto(
    int UserId,
    string Name,
    string Username,
    string Role,
    DateOnly WorkDate,
    string Status,
    DateTime? CheckIn,
    DateTime? CheckOut,
    string? Notes);

public record CreateStaffRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, StringLength(50, MinimumLength = 3)] string Username,
    string? Phone,
    [MinLength(6)] string? Password,
    [RegularExpression(@"^\d{4}$")] string? Pin,
    [Required, StringLength(50, MinimumLength = 2)] string Role,
    string? InitialAttendance,
    DateOnly? AttendanceDate);

public record UpdateStaffRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, StringLength(50, MinimumLength = 3)] string Username,
    string? Phone,
    [MinLength(6)] string? Password,
    [RegularExpression(@"^\d{4}$")] string? Pin,
    [Required, StringLength(50, MinimumLength = 2)] string Role);

public record SetStaffActiveRequest(bool IsActive);

public record SetAttendanceRequest(int UserId, DateOnly WorkDate, string Status, string? Notes);
