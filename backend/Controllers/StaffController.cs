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
    public async Task<ActionResult<IReadOnlyList<StaffDto>>> GetStaff(
        [FromQuery] string? search,
        [FromQuery] bool? active)
    {
        var staff = db.Users
            .AsNoTracking()
            .Where(user => user.Role != UserRole.Admin);

        if (active.HasValue)
            staff = staff.Where(user => user.IsActive == active.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            staff = staff.Where(user =>
                user.Name.Contains(term) ||
                user.Username.Contains(term) ||
                (user.Phone != null && user.Phone.Contains(term)) ||
                (user.JobTitle != null && user.JobTitle.Contains(term)));
        }

        var result = await staff
            .OrderByDescending(user => user.IsActive)
            .ThenBy(user => user.Name)
            .Select(user => new StaffDto(
                user.Id,
                user.Name,
                user.Username,
                user.Phone,
                user.JobTitle ?? user.Role.ToString(),
                user.IsActive))
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<StaffDto>> CreateStaff([FromBody] CreateStaffRequest request)
    {
        var (role, jobTitle) = ParseStaffRole(request.Role);
        if (role is null)
            return BadRequest(new { message = "Choose a valid staff role. Admin cannot be created here." });
        if (request.InitialAttendance is not null &&
            (request.AttendanceDate is null || !IsAttendanceStatus(request.InitialAttendance)))
            return BadRequest(new { message = "Choose a valid attendance date and status." });

        var username = request.Username.Trim();
        if (await db.Users.AnyAsync(user => user.Username == username))
            return Conflict(new { message = "That username is already in use." });

        var temporaryPassword = string.IsNullOrWhiteSpace(request.Password)
            ? CreateTemporaryPassword()
            : request.Password;
        var user = new User
        {
            Name = request.Name.Trim(),
            Username = username,
            Phone = NormalizeOptional(request.Phone),
            JobTitle = jobTitle,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword),
            PinHash = string.IsNullOrWhiteSpace(request.Pin)
                ? null
                : BCrypt.Net.BCrypt.HashPassword(request.Pin),
            Role = role.Value,
        };

        db.Users.Add(user);
        if (request.InitialAttendance is not null && request.AttendanceDate is { } attendanceDate)
        {
            db.StaffAttendance.Add(new StaffAttendance
            {
                User = user,
                StaffName = user.Name,
                WorkDate = attendanceDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                Status = request.InitialAttendance,
                MarkedAt = DateTime.UtcNow,
                RecordedByUserId = User.GetUserId(),
            });
        }

        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_CREATE", $"Created {user.JobTitle ?? user.Role.ToString()} account {user.Username}");
        return Ok(ToStaffDto(user) with { TemporaryPassword = temporaryPassword });
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StaffDto>> UpdateStaff(int id, [FromBody] UpdateStaffRequest request)
    {
        var (role, jobTitle) = ParseStaffRole(request.Role);
        if (role is null)
            return BadRequest(new { message = "Choose a valid staff role. Admin cannot be assigned here." });

        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == id && user.Role != UserRole.Admin);
        if (user is null) return NotFound(new { message = "Staff member not found." });

        var username = request.Username.Trim();
        if (await db.Users.AnyAsync(other => other.Id != id && other.Username == username))
            return Conflict(new { message = "That username is already in use." });

        user.Name = request.Name.Trim();
        user.Username = username;
        user.Phone = NormalizeOptional(request.Phone);
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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> ArchiveStaff(int id)
    {
        var currentUserId = User.GetUserId();
        if (id == currentUserId)
            return BadRequest(new { message = "You cannot archive your own account." });

        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == id && user.Role != UserRole.Admin);
        if (user is null) return NotFound(new { message = "Staff member not found." });
        if (!user.IsActive) return NoContent();

        user.IsActive = false;
        await db.SaveChangesAsync();
        await audit.LogAsync(currentUserId, "STAFF_ARCHIVE", $"Archived staff account {user.Username}; history retained");
        return NoContent();
    }

    [HttpPut("{id:int}/active")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<StaffDto>> SetStaffActive(int id, [FromBody] SetStaffActiveRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == id && user.Role != UserRole.Admin);
        if (user is null) return NotFound(new { message = "Staff member not found." });

        user.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_STATUS", $"Set {user.Username} active={user.IsActive}");
        return Ok(ToStaffDto(user));
    }

    [HttpPost("{id:int}/password-reset")]
    public async Task<ActionResult<TemporaryPasswordDto>> ResetStaffPassword(int id)
    {
        var user = await db.Users.FirstOrDefaultAsync(user => user.Id == id && user.Role != UserRole.Admin);
        if (user is null) return NotFound(new { message = "Staff member not found." });
        if (!user.IsActive)
            return Conflict(new { message = "Archived accounts must be reactivated before resetting their password." });

        var temporaryPassword = CreateTemporaryPassword();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword);
        user.PinHash = null;
        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_PASSWORD_RESET", $"Reset password for staff account {user.Username}");
        return Ok(new TemporaryPasswordDto(temporaryPassword));
    }

    [HttpGet("attendance")]
    public async Task<ActionResult<IReadOnlyList<AttendanceDto>>> GetAttendance(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? name,
        [FromQuery] DateOnly? date,
        [FromQuery] int? userId)
    {
        var fromDate = from ?? date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var toDate = to ?? date ?? fromDate;
        if (fromDate > toDate)
            return BadRequest(new { message = "The start date must be on or before the end date." });

        var start = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endExclusive = toDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var records = db.StaffAttendance
            .AsNoTracking()
            .Where(record => record.WorkDate >= start && record.WorkDate < endExclusive);

        if (userId.HasValue)
            records = records.Where(record => record.UserId == userId.Value);

        if (!string.IsNullOrWhiteSpace(name))
        {
            var term = name.Trim();
            records = records.Where(record =>
                record.User.Name.Contains(term) || record.User.Username.Contains(term));
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
                record.Notes,
                record.MarkedAt))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("attendance/summary")]
    public async Task<ActionResult<IReadOnlyList<AttendanceSummaryDto>>> GetAttendanceSummary(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] int? userId)
    {
        if (from == default || to == default || from > to)
            return BadRequest(new { message = "Choose a valid date range." });

        var start = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endExclusive = to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var records = db.StaffAttendance
            .AsNoTracking()
            .Where(record => record.WorkDate >= start && record.WorkDate < endExclusive);

        if (userId.HasValue)
            records = records.Where(record => record.UserId == userId.Value);

        var summary = await records
            .GroupBy(record => record.UserId)
            .Select(group => new AttendanceSummaryDto(
                group.Key,
                group.Count(record => record.Status == "Present"),
                group.Count(record => record.Status == "Half day"),
                group.Count(record => record.Status == "Leave"),
                group.Count(record => record.Status == "Absent"),
                group.Count()))
            .ToListAsync();

        return Ok(summary);
    }

    [HttpPut("attendance")]
    public async Task<ActionResult<AttendanceDto>> SetAttendance([FromBody] SetAttendanceRequest request)
    {
        if (request.WorkDate == default)
            return BadRequest(new { message = "Choose a valid attendance date." });
        if (!IsAttendanceStatus(request.Status))
            return BadRequest(new { message = "Attendance status must be Present, Absent, Leave, or Half day." });
        if (request.Notes?.Length > 250)
            return BadRequest(new { message = "Attendance notes must be 250 characters or fewer." });
        if (request.CheckIn.HasValue && request.CheckOut.HasValue && request.CheckOut <= request.CheckIn)
            return BadRequest(new { message = "Check-out must be later than check-in." });

        var staff = await db.Users.FirstOrDefaultAsync(user =>
            user.Id == request.UserId && user.IsActive && user.Role != UserRole.Admin);
        if (staff is null) return NotFound(new { message = "Active staff member not found." });

        var workDate = request.WorkDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var record = await db.StaffAttendance.FirstOrDefaultAsync(item =>
            item.UserId == staff.Id && item.WorkDate == workDate);
        if (record is null)
        {
            record = new StaffAttendance
            {
                UserId = staff.Id,
                WorkDate = workDate,
                RecordedByUserId = User.GetUserId(),
            };
            db.StaffAttendance.Add(record);
        }

        record.Status = request.Status;
        record.StaffName = staff.Name;
        record.Notes = NormalizeOptional(request.Notes);
        record.RecordedByUserId = User.GetUserId();
        record.MarkedAt = DateTime.UtcNow;
        if (request.Status is "Absent" or "Leave")
        {
            record.CheckIn = null;
            record.CheckOut = null;
        }
        else
        {
            if (request.CheckIn.HasValue)
                record.CheckIn = workDate.Add(request.CheckIn.Value.ToTimeSpan());
            if (request.CheckOut.HasValue)
                record.CheckOut = workDate.Add(request.CheckOut.Value.ToTimeSpan());
        }

        await db.SaveChangesAsync();
        await audit.LogAsync(User.GetUserId(), "STAFF_ATTENDANCE", $"{staff.Username} {request.Status} on {request.WorkDate}");
        return Ok(new AttendanceDto(
            staff.Id,
            staff.Name,
            staff.Username,
            staff.JobTitle ?? staff.Role.ToString(),
            request.WorkDate,
            record.Status,
            record.CheckIn,
            record.CheckOut,
            record.Notes,
            record.MarkedAt));
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

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string CreateTemporaryPassword()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(24));
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
    string? Notes,
    DateTime? MarkedAt);

public record AttendanceSummaryDto(int UserId, int Present, int HalfDay, int Leave, int Absent, int TotalRecords);
public record TemporaryPasswordDto(string TemporaryPassword);
public record CreateStaffRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, StringLength(50, MinimumLength = 3)] string Username,
    [StringLength(30)] string? Phone,
    [MinLength(8), StringLength(100)] string? Password,
    [RegularExpression(@"^\d{4}$")] string? Pin,
    [Required, StringLength(50, MinimumLength = 2)] string Role,
    string? InitialAttendance,
    DateOnly? AttendanceDate);

public record UpdateStaffRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, StringLength(50, MinimumLength = 3)] string Username,
    [StringLength(30)] string? Phone,
    [MinLength(8), StringLength(100)] string? Password,
    [RegularExpression(@"^\d{4}$")] string? Pin,
    [Required, StringLength(50, MinimumLength = 2)] string Role);

public record SetStaffActiveRequest(bool IsActive);

public record SetAttendanceRequest(
    int UserId,
    DateOnly WorkDate,
    string Status,
    [StringLength(250)] string? Notes,
    TimeOnly? CheckIn = null,
    TimeOnly? CheckOut = null);
