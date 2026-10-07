using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ProfileService.Application.Features.Profile.Commands.CreateProfile;
using ProfileService.Infrastructure.DependencyInjection;
using ProfileService.Persistence.Contexts;
using Shared.Common.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

#region Controllers

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

#endregion

#region Configuration

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("JwtSettings"));

var jwtSettings = builder.Configuration
    .GetSection("JwtSettings")
    .Get<JwtSettings>();

if (jwtSettings == null)
{
    throw new InvalidOperationException(
        "JwtSettings configuration is missing.");
}

if (string.IsNullOrWhiteSpace(jwtSettings.Key))
{
    throw new InvalidOperationException(
        "JwtSettings:Key configuration is missing.");
}

if (string.IsNullOrWhiteSpace(jwtSettings.Issuer))
{
    throw new InvalidOperationException(
        "JwtSettings:Issuer configuration is missing.");
}

if (string.IsNullOrWhiteSpace(jwtSettings.Audience))
{
    throw new InvalidOperationException(
        "JwtSettings:Audience configuration is missing.");
}

var key = Encoding.UTF8.GetBytes(jwtSettings.Key);

#endregion

#region Swagger

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title = "MeetYourBuddy Profile Service API",
            Version = "v1"
        });

    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Enter your JWT token"
        });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
});

#endregion

#region MediatR

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(
        typeof(CreateProfileCommand).Assembly);
});

#endregion

#region Persistence / Infrastructure

builder.Services.AddScoped<DapperContext>();

builder.Services.AddInfrastructure();

#endregion

#region Authentication

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        /*
         * Keep JWT claim names exactly as issued
         * by IdentityService.
         */
        options.MapInboundClaims = false;

        options.SaveToken = true;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,

                ValidateAudience = true,

                ValidateIssuerSigningKey = true,

                ValidateLifetime = true,

                ValidIssuer =
                    jwtSettings.Issuer,

                ValidAudience =
                    jwtSettings.Audience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(key),

                ClockSkew = TimeSpan.Zero,

                NameClaimType = "sub",

                RoleClaimType = "role"
            };
    });

builder.Services.AddAuthorization();

#endregion

#region CORS

var configuredOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
    ?? Array.Empty<string>();

var normalizedOrigins = configuredOrigins
    .Where(origin =>
        !string.IsNullOrWhiteSpace(origin))
    .Select(origin =>
        origin.Trim().TrimEnd('/'))
    .ToHashSet(
        StringComparer.OrdinalIgnoreCase);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin))
                {
                    return false;
                }

                var normalizedOrigin =
                    origin.Trim().TrimEnd('/');

                /*
                 * Allow exact origins configured
                 * in appsettings/environment variables.
                 */
                if (normalizedOrigins.Contains(
                    normalizedOrigin))
                {
                    return true;
                }

                if (!Uri.TryCreate(
                        origin,
                        UriKind.Absolute,
                        out var uri))
                {
                    return false;
                }

                /*
                 * Local Next.js development.
                 */
                if (uri.Host.Equals(
                        "localhost",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return
                        uri.Scheme.Equals(
                            "http",
                            StringComparison.OrdinalIgnoreCase)
                        ||
                        uri.Scheme.Equals(
                            "https",
                            StringComparison.OrdinalIgnoreCase);
                }

                /*
                 * Allow Vercel production/preview
                 * deployments while deployment is
                 * still being stabilized.
                 */
                if (
                    uri.Scheme.Equals(
                        "https",
                        StringComparison.OrdinalIgnoreCase)
                    &&
                    uri.Host.EndsWith(
                        ".vercel.app",
                        StringComparison.OrdinalIgnoreCase)
                )
                {
                    return true;
                }

                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

#endregion

#region Health Checks

builder.Services.AddHealthChecks();

#endregion

var app = builder.Build();

#region Middleware

/*
 * ProfileService is hosted behind IIS/SmarterASP
 * under /profile, so HTTPS is handled by the host.
 *
 * Do not add UseHttpsRedirection().
 */

app.UseRouting();

/*
 * CORS must execute before authentication
 * and authorization.
 */
app.UseCors("AllowFrontend");

app.UseAuthentication();

app.UseAuthorization();

/*
 * Keep Swagger enabled while deployment
 * and API testing are still in progress.
 */
app.UseSwagger();

app.UseSwaggerUI(options =>
{
    /*
     * Relative Swagger endpoint is important because
     * this application is hosted under /profile.
     */
    options.SwaggerEndpoint(
        "./v1/swagger.json",
        "Profile Service API v1");
});

app.MapControllers();

app.MapHealthChecks("/health")
    .AllowAnonymous();

#endregion

app.Run();