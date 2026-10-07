using ChatService.Application;
using ChatService.Application.Interfaces;
using MatchingService.Application.Interfaces;
using MatchingService.Infrastructure.Repositories;
using MatchingService.Persistance.Contexts;
using MediatR;
using MeetYourBuddy.ChatService.Api.Services;
using MeetYourBuddy.ChatService.API.Configuration;
using MeetYourBuddy.ChatService.API.Hubs;
using MeetYourBuddy.ChatService.Application;
using MeetYourBuddy.ChatService.Application.Interfaces;
using MeetYourBuddy.ChatService.Persistence.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Data;
using System.Security.Cryptography;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

#region Controllers / Core Services

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddHttpClient();

builder.Services.AddSignalR();

#endregion

#region Ollama HttpClient

builder.Services.AddHttpClient(
    "Ollama",
    client =>
    {
        client.Timeout = TimeSpan.FromMinutes(3);
    });

#endregion

#region Swagger

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title = "MeetYourBuddy Chat Service API",
            Version = "v1",
            Description =
                "Chat, SignalR and Buddy AI service for MeetYourBuddy"
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

            Description =
                "Enter your JWT token. Swagger will add Bearer automatically."
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
 * Local development:
 *
 * SwaggerAuth:Username
 * SwaggerAuth:Password
 *
 * Store them with dotnet user-secrets.
 *
 * Production:
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

#region MediatR

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(
        typeof(ApplicationAssemblyReference).Assembly);
});

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

builder.Services.AddSingleton<DapperContext>();

#endregion

#region Repository

builder.Services.AddScoped<
    IMatchingRepository,
    MatchingRepository>();

builder.Services.AddScoped<
    IChatRepository,
    ChatRepository>();

#endregion

#region OpenAI / FitBot

builder.Services.Configure<OpenAiOptions>(
    builder.Configuration.GetSection("OpenAI"));

builder.Services.AddHttpClient<
    IOpenAiFitnessService,
    OpenAiFitnessService>(
    client =>
    {
        client.Timeout =
            TimeSpan.FromSeconds(45);
    });

#endregion

#region JWT Configuration

var jwtSettings =
    builder.Configuration.GetSection(
        "JwtSettings");

var jwtKey =
    jwtSettings["Key"];

var jwtIssuer =
    jwtSettings["Issuer"];

var jwtAudience =
    jwtSettings["Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "JwtSettings:Key configuration is missing.");
}

if (string.IsNullOrWhiteSpace(jwtIssuer))
{
    throw new InvalidOperationException(
        "JwtSettings:Issuer configuration is missing.");
}

if (string.IsNullOrWhiteSpace(jwtAudience))
{
    throw new InvalidOperationException(
        "JwtSettings:Audience configuration is missing.");
}

#endregion

#region Authentication

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultScheme =
            JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        /*
         * Keep claim names exactly as IdentityService
         * creates them.
         *
         * Example:
         * sub
         * role
         */
        options.MapInboundClaims = false;

        options.SaveToken = true;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtKey)),

                ValidateIssuer = true,

                ValidIssuer =
                    jwtIssuer,

                ValidateAudience = true,

                ValidAudience =
                    jwtAudience,

                ValidateLifetime = true,

                ClockSkew =
                    TimeSpan.Zero,

                NameClaimType =
                    "sub",

                RoleClaimType =
                    "role"
            };

        /*
         * SignalR sends its JWT through the
         * access_token query parameter during
         * WebSocket/SSE negotiation.
         */
        options.Events =
            new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken =
                        context.Request
                            .Query["access_token"];

                    var path =
                        context.HttpContext
                            .Request.Path;

                    if (
                        !string.IsNullOrWhiteSpace(
                            accessToken)
                        &&
                        path.StartsWithSegments(
                            "/chatHub")
                    )
                    {
                        context.Token =
                            accessToken;
                    }

                    return Task.CompletedTask;
                },

                OnAuthenticationFailed = context =>
                {
                    var logger =
                        context.HttpContext
                            .RequestServices
                            .GetRequiredService<
                                ILoggerFactory>()
                            .CreateLogger(
                                "JwtAuthentication");

                    logger.LogWarning(
                        context.Exception,
                        "JWT authentication failed.");

                    return Task.CompletedTask;
                }
            };
    });

builder.Services.AddAuthorization();

#endregion

#region CORS

/*
 * SignalR requires credentials.
 *
 * Because of AllowCredentials(), we CANNOT use:
 *
 * AllowAnyOrigin()
 *
 * So we validate allowed origins instead.
 */

var configuredOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
    ?? Array.Empty<string>();

var normalizedOrigins =
    configuredOrigins
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
                    if (
                        string.IsNullOrWhiteSpace(
                            origin))
                    {
                        return false;
                    }

                    var normalizedOrigin =
                        origin.Trim()
                            .TrimEnd('/');

                    /*
                     * Explicit origins from
                     * appsettings.json.
                     */
                    if (
                        normalizedOrigins.Contains(
                            normalizedOrigin))
                    {
                        return true;
                    }

                    if (
                        !Uri.TryCreate(
                            origin,
                            UriKind.Absolute,
                            out var uri))
                    {
                        return false;
                    }

                    /*
                     * Local development.
                     */
                    if (
                        uri.Host.Equals(
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
                     * Vercel production and preview
                     * deployments.
                     */
                    if (
                        uri.Scheme.Equals(
                            "https",
                            StringComparison.OrdinalIgnoreCase)
                        &&
                        uri.Host.EndsWith(
                            ".vercel.app",
                            StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    return false;
                })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
});

#endregion

#region Health Checks

builder.Services.AddHealthChecks();

#endregion

var app = builder.Build();

#region Routing

/*
 * SmarterASP / IIS handles HTTPS.
 *
 * Do NOT use:
 *
 * app.UseHttpsRedirection();
 */

app.UseRouting();

#endregion

#region Swagger Password Protection

/*
 * Protects:
 *
 * /swagger
 * /swagger/index.html
 * /swagger/v1/swagger.json
 * Swagger CSS/JS files
 *
 * It does NOT protect /api endpoints.
 */

app.Use(async (context, next) =>
{
    if (
        !context.Request.Path
            .StartsWithSegments("/swagger"))
    {
        await next();
        return;
    }

    var authorizationHeader =
        context.Request.Headers
            .Authorization
            .ToString();

    if (
        !string.IsNullOrWhiteSpace(
            authorizationHeader)
        &&
        authorizationHeader.StartsWith(
            "Basic ",
            StringComparison.OrdinalIgnoreCase))
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
                    credentials[
                        ..separatorIndex];

                var suppliedPassword =
                    credentials[
                        (separatorIndex + 1)..];

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
             * Invalid Base64 auth header.
             */
        }
    }

    context.Response.Headers
        .WWWAuthenticate =
        "Basic realm=\"MeetYourBuddy Swagger\", charset=\"UTF-8\"";

    context.Response.StatusCode =
        StatusCodes.Status401Unauthorized;

    await context.Response.WriteAsync(
        "Swagger authentication required.");
});

#endregion

#region Swagger Middleware

/*
 * Keep Swagger enabled while we deploy/test.
 * Password middleware above protects it.
 */

app.UseSwagger();

app.UseSwaggerUI(options =>
{
    /*
     * Relative URL is important because the
     * service will be hosted at:
     *
     * /chat
     */
    options.SwaggerEndpoint(
        "./v1/swagger.json",
        "Chat Service API v1");

    options.DocumentTitle =
        "MeetYourBuddy - Chat API";

    options.DisplayRequestDuration();

    options.EnableDeepLinking();
});

#endregion

#region CORS / Authentication

/*
 * CORS needs to run before authentication
 * for frontend/API requests.
 */

app.UseCors("AllowFrontend");

app.UseAuthentication();

app.UseAuthorization();

#endregion

#region Endpoints

app.MapControllers();

/*
 * SignalR endpoint.
 *
 * Production URL:
 *
 * https://meetyourbuddy-001-site1.ctempurl.com/chat/chatHub
 */

app.MapHub<ChatHub>("/chatHub")
    .RequireCors("AllowFrontend");

/*
 * Public health endpoint.
 *
 * Production:
 *
 * /chat/health
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

    return CryptographicOperations
        .FixedTimeEquals(
            suppliedBytes,
            expectedBytes);
}

#endregion