using MatchingService.Application;
using MatchingService.Application.Interfaces;
using MatchingService.Infrastructure.Repositories;
using MatchingService.Persistance.Contexts;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Shared.Common.Models;
using System.Data;
using System.Security.Cryptography;
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
            Title = "MeetYourBuddy Matching Service API",
            Version = "v1",
            Description = "Matching and Social Wall Service for MeetYourBuddy"
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

#region Swagger Basic Authentication

/*
 * Local:
 * dotnet user-secrets
 *
 * Production:
 * SmarterASP environment variables
 *
 * SwaggerAuth__Username
 * SwaggerAuth__Password
 */

var swaggerUsername =
    builder.Configuration["SwaggerAuth:Username"];

var swaggerPassword =
    builder.Configuration["SwaggerAuth:Password"];

if (string.IsNullOrWhiteSpace(swaggerUsername))
{
    throw new InvalidOperationException(
        "SwaggerAuth:Username configuration is missing.");
}

if (string.IsNullOrWhiteSpace(swaggerPassword))
{
    throw new InvalidOperationException(
        "SwaggerAuth:Password configuration is missing.");
}

#endregion

#region Database

var connectionString =
    builder.Configuration.GetConnectionString(
        "DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is missing.");
}

builder.Services.AddScoped<IDbConnection>(_ =>
    new SqlConnection(connectionString));

#endregion

#region Repository

builder.Services.AddSingleton<DapperContext>();

builder.Services.AddScoped<
    IMatchingRepository,
    MatchingRepository>();

#endregion

#region MediatR

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(
        typeof(ApplicationAssemblyReference).Assembly);
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
        /*
         * Preserve claims exactly as IdentityService
         * created them.
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
    options.AddPolicy(
        "AllowFrontend",
        policy =>
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
                     * Origins explicitly defined
                     * in configuration.
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
                     * Vercel production and
                     * preview deployments.
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
 * SmarterASP / IIS terminates HTTPS.
 *
 * Do not use:
 *
 * app.UseHttpsRedirection();
 */

app.UseRouting();

#endregion

#region Swagger Password Protection

/*
 * Password protects:
 *
 * /swagger
 * /swagger/index.html
 * /swagger/v1/swagger.json
 * Swagger JS/CSS assets
 *
 * Normal API endpoints are not affected.
 */

app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments(
            "/swagger"))
    {
        await next();
        return;
    }

    var authorizationHeader =
        context.Request.Headers.Authorization
            .ToString();

    if (
        !string.IsNullOrWhiteSpace(
            authorizationHeader)
        &&
        authorizationHeader.StartsWith(
            "Basic ",
            StringComparison.OrdinalIgnoreCase)
    )
    {
        try
        {
            var encodedCredentials =
                authorizationHeader[
                    "Basic ".Length..
                ].Trim();

            var credentialBytes =
                Convert.FromBase64String(
                    encodedCredentials);

            var credentials =
                Encoding.UTF8.GetString(
                    credentialBytes);

            var separatorIndex =
                credentials.IndexOf(':');

            if (separatorIndex > 0)
            {
                var suppliedUsername =
                    credentials[..separatorIndex];

                var suppliedPassword =
                    credentials[
                        (separatorIndex + 1)..
                    ];

                var usernameMatches =
                    SecureEquals(
                        suppliedUsername,
                        swaggerUsername);

                var passwordMatches =
                    SecureEquals(
                        suppliedPassword,
                        swaggerPassword);

                if (
                    usernameMatches &&
                    passwordMatches)
                {
                    await next();
                    return;
                }
            }
        }
        catch (FormatException)
        {
            /*
             * Invalid Basic Auth header.
             */
        }
    }

    context.Response.Headers.WWWAuthenticate =
        "Basic realm=\"MeetYourBuddy Swagger\", charset=\"UTF-8\"";

    context.Response.StatusCode =
        StatusCodes.Status401Unauthorized;

    await context.Response.WriteAsync(
        "Swagger authentication required.");
});

#endregion

#region Swagger Middleware

app.UseSwagger();

app.UseSwaggerUI(options =>
{
    /*
     * Relative Swagger endpoint because this
     * application is hosted under /matching.
     */
    options.SwaggerEndpoint(
        "./v1/swagger.json",
        "Matching Service API v1");

    options.DocumentTitle =
        "MeetYourBuddy - Matching API";

    options.DisplayRequestDuration();

    options.EnableDeepLinking();
});

#endregion

#region Application Middleware

app.UseCors("AllowFrontend");

app.UseAuthentication();

app.UseAuthorization();

#endregion

#region Endpoints

app.MapControllers();

/*
 * Public health check:
 *
 * /matching/health
 */
app.MapHealthChecks("/health")
    .AllowAnonymous();

#endregion

app.Run();

#region Helper Methods

static bool SecureEquals(
    string suppliedValue,
    string expectedValue)
{
    var suppliedBytes =
        Encoding.UTF8.GetBytes(
            suppliedValue);

    var expectedBytes =
        Encoding.UTF8.GetBytes(
            expectedValue);

    if (
        suppliedBytes.Length !=
        expectedBytes.Length)
    {
        return false;
    }

    return CryptographicOperations.FixedTimeEquals(
        suppliedBytes,
        expectedBytes);
}

#endregion