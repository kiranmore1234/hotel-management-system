using Bramhand.Api.Data;
using Bramhand.Api.Models.Entities;

namespace Bramhand.Api.Services;

public interface IAuditService
{
    Task LogAsync(int? userId, string action, string? details = null);
}

public class AuditService(AppDbContext db) : IAuditService
{
    public async Task LogAsync(int? userId, string action, string? details = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }
}
