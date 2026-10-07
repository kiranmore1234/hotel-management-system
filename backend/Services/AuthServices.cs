using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Bramhand.Api.Models;
using Bramhand.Api.Models.Entities;
using Microsoft.IdentityModel.Tokens;

namespace Bramhand.Api.Services;

public class JwtSettings
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "Bramhand";
    public string Audience { get; set; } = "BramhandApp";
    public int ExpiryHours { get; set; } = 12;
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateToken(User user);
}

public class TokenService(JwtSettings settings) : ITokenService
{
    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var expires = DateTime.UtcNow.AddHours(settings.ExpiryHours);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new("display_name", user.Name),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}

public static class RoleNames
{
    public const string Admin = nameof(UserRole.Admin);
    public const string Manager = nameof(UserRole.Manager);
    public const string Captain = nameof(UserRole.Captain);
    public const string AdminOrManager = $"{Admin},{Manager}";
    public const string AllStaff = $"{Admin},{Manager},{Captain}";
}

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : 0;
    }

    public static string GetDisplayName(this ClaimsPrincipal user)
        => user.FindFirstValue("display_name") ?? user.Identity?.Name ?? "User";

    public static bool IsAdminOrManager(this ClaimsPrincipal user)
        => user.IsInRole(RoleNames.Admin) || user.IsInRole(RoleNames.Manager);
}
