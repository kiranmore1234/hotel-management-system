using Bramhand.Api.Data;
using Bramhand.Api.DTOs;
using Bramhand.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bramhand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AppDbContext db,
    ITokenService tokenService,
    IAuditService audit) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.Username == request.Username && u.IsActive);

        if (user is null)
            return Unauthorized(new { message = "Invalid username or credentials" });

        var valid = false;
        if (!string.IsNullOrWhiteSpace(request.Pin) && !string.IsNullOrEmpty(user.PinHash))
            valid = BCrypt.Net.BCrypt.Verify(request.Pin, user.PinHash);
        else if (!string.IsNullOrWhiteSpace(request.Password))
            valid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

        if (!valid)
            return Unauthorized(new { message = "Invalid username or credentials" });

        var (token, expires) = tokenService.CreateToken(user);
        await audit.LogAsync(user.Id, "LOGIN", $"User {user.Username} logged in");

        return Ok(new LoginResponse(
            token,
            user.Id,
            user.Name,
            user.Username,
            user.Role.ToString(),
            expires));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        if (user is null) return Unauthorized();
        return Ok(new UserDto(user.Id, user.Name, user.Username, user.Phone, user.Role.ToString(), user.IsActive));
    }
}
