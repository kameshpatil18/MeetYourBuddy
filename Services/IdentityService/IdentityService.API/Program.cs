using IdentityService.Application.Features.Auth.Commands.RegisterUser;
using IdentityService.Application.Interfaces;
using IdentityService.Infrastructure.Repositories;
using IdentityService.Infrastructure.Services;
using IdentityService.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
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

builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));

var jwtSettings = builder.Configuration
    .GetSection("JwtSettings")
    .Get<JwtSettings>()
    ?? throw new InvalidOperationException(
        "JwtSettings configuration is missing.");

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

#region MediatR

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(
        typeof(RegisterUserCommand).Assembly);
});

#endregion

#region Dependencies

builder.Services.AddSingleton<DapperContext>();

builder.Services.AddScoped<
    IUserRepository,
    UserRepository>();

builder.Services.AddScoped<
    IJwtTokenGenerator,
    JwtTokenGenerator>();

builder.Services.AddScoped<
    IEmailService,
    EmailService>();

#endregion

#region CORS

var configuredOrigins = builder.Configuration
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

                // Explicitly configured origins.
                if (normalizedOrigins.Contains(
                    normalizedOrigin))
                {
                    return true;
                }

                if (!Uri.TryCreate(
                        normalizedOrigin,
                        UriKind.Absolute,
                        out var uri))
                {
                    return false;
                }

                // Local Next.js frontend.
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

                // Temporary support for Vercel production
                // and preview deployments.
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

                ClockSkew = TimeSpan.Zero
            };
    });

builder.Services.AddAuthorization();

#endregion

#region Swagger

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title =
                "MeetYourBuddy Identity Service API",

            Version = "v1"
        });

    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",

            Type =
                SecuritySchemeType.Http,

            Scheme = "bearer",

            BearerFormat = "JWT",

            In =
                ParameterLocation.Header,

            Description =
                "Enter your JWT token"
        });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference =
                        new OpenApiReference
                        {
                            Type =
                                ReferenceType.SecurityScheme,

                            Id = "Bearer"
                        }
                },
                Array.Empty<string>()
            }
        });
});

#endregion

#region Health Checks

builder.Services.AddHealthChecks();

#endregion

var app = builder.Build();

#region Middleware

/*
 * IIS / SmarterASP terminates HTTPS,
 * so HTTPS redirection is intentionally omitted.
 */

app.UseRouting();

/*
 * IMPORTANT:
 * CORS must execute after routing and before
 * authentication / authorization.
 */
app.UseCors("AllowFrontend");

app.UseAuthentication();

app.UseAuthorization();

/*
 * Keep Swagger enabled while deploying/testing.
 */
app.UseSwagger();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint(
        "/swagger/v1/swagger.json",
        "Identity Service API v1");
});

app.MapControllers();

app.MapHealthChecks("/health");

#endregion

app.Run();