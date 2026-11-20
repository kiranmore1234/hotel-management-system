using System.Text;
using System.Text.Json.Serialization;
using System.Net;
using System.Security.Claims;
using Bramhand.Api.Data;
using Bramhand.Api.Hubs;
using Bramhand.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
if (Encoding.UTF8.GetByteCount(jwtSettings.Key) < 32)
{
    throw new InvalidOperationException(
        "Configure Jwt:Key with a secret of at least 32 bytes using .NET User Secrets or environment variables.");
}

builder.Services.AddSingleton(jwtSettings);
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IRealtimeService, RealtimeService>();

var databaseProvider = builder.Configuration["Database:Provider"] ?? "SqlServer";
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Configure ConnectionStrings:Default for the selected database provider.");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    switch (databaseProvider.Trim().ToLowerInvariant())
    {
        case "sqlserver":
            options.UseSqlServer(connectionString);
            break;
        case "sqlite":
            options.UseSqlite(connectionString);
            break;
        default:
            throw new InvalidOperationException(
                $"Unsupported database provider '{databaseProvider}'. Supported providers are SqlServer and Sqlite.");
    }
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/restaurant"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var userIdValue = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdValue, out var userId) ||
                    !await context.HttpContext.RequestServices
                        .GetRequiredService<AppDbContext>()
                        .Users.AnyAsync(
                            user => user.Id == userId &&
                                    user.IsActive &&
                                    (user.Role == Bramhand.Api.Models.UserRole.Admin ||
                                     user.Role == Bramhand.Api.Models.UserRole.Manager),
                            context.HttpContext.RequestAborted))
                {
                    context.Fail("The account is inactive, unauthorized, or no longer exists.");
                }
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR();
builder.Services.AddOpenApi();

var configuredFrontendOrigins =
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.SetIsOriginAllowed(origin =>
                IsAllowedFrontendOrigin(origin) ||
                configuredFrontendOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<RestaurantHub>("/hubs/restaurant");
app.MapGet("/", () => Results.Ok(new { app = "Niyojan Resto API", status = "running" }));

app.Run();

static bool IsAllowedFrontendOrigin(string origin)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
        uri.Scheme != Uri.UriSchemeHttp ||
        uri.Port != 3000)
    {
        return false;
    }

    if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        return true;

    if (!IPAddress.TryParse(uri.Host, out var address))
        return false;

    if (IPAddress.IsLoopback(address))
        return true;

    if (address.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
        return false;

    var bytes = address.GetAddressBytes();
    return bytes[0] == 10 ||
           bytes[0] == 192 && bytes[1] == 168 ||
           bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31;
}
