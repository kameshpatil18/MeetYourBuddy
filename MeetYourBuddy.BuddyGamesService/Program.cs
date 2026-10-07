using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

using MeetYourBuddy.BuddyGamesService.Hubs;
using MeetYourBuddy.BuddyGamesService.Repositories;
using MeetYourBuddy.BuddyGamesService.Services;


var builder =
    WebApplication.CreateBuilder(args);


//
// =========================================================
// CONTROLLERS
// =========================================================
//

builder.Services.AddControllers();


//
// =========================================================
// SIGNALR
// =========================================================
//

builder.Services.AddSignalR();


//
// =========================================================
// SWAGGER
// =========================================================
//

builder.Services.AddEndpointsApiExplorer();


builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title =
                "MeetYourBuddy Buddy Games API",

            Version = "v1",

            Description =
                "Buddy Games Service for MeetYourBuddy"
        });


    //
    // JWT Bearer Authentication in Swagger
    //

    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Type =
                SecuritySchemeType.Http,

            Scheme = "bearer",

            BearerFormat = "JWT",

            Description =
                "Enter your JWT token."
        });


    //
    // Swashbuckle v10+
    //

    options.AddSecurityRequirement(
        document =>
            new OpenApiSecurityRequirement
            {
                [
                    new OpenApiSecuritySchemeReference(
                        "Bearer",
                        document)
                ] = []
            });
});


//
// =========================================================
// DEPENDENCY INJECTION
// =========================================================
//

builder.Services.AddScoped<
    IBuddyGamesRepository,
    BuddyGamesRepository>();


builder.Services.AddScoped<
    IBuddyGamesService,
    BuddyGamesService>();


//
// =========================================================
// JWT SETTINGS
// =========================================================
//

var jwtSection =
    builder.Configuration
        .GetSection("JwtSettings");


var jwtKey =
    jwtSection["Key"]
    ?? throw new InvalidOperationException(
        "JwtSettings:Key is missing.");


var jwtIssuer =
    jwtSection["Issuer"]
    ?? throw new InvalidOperationException(
        "JwtSettings:Issuer is missing.");


var jwtAudience =
    jwtSection["Audience"]
    ?? throw new InvalidOperationException(
        "JwtSettings:Audience is missing.");


//
// =========================================================
// JWT AUTHENTICATION
// =========================================================
//

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults
                .AuthenticationScheme;


        options.DefaultChallengeScheme =
            JwtBearerDefaults
                .AuthenticationScheme;
    })

    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,

                ValidateAudience = true,

                ValidateLifetime = true,

                ValidateIssuerSigningKey = true,


                ValidIssuer =
                    jwtIssuer,


                ValidAudience =
                    jwtAudience,


                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtKey)),


                //
                // Token expires exactly when expiry says.
                //

                ClockSkew =
                    TimeSpan.Zero
            };


        //
        // =====================================================
        // SIGNALR JWT SUPPORT
        // =====================================================
        //
        // Browser WebSocket connections can send JWT through:
        //
        // ?access_token=...
        //

        options.Events =
            new JwtBearerEvents
            {
                OnMessageReceived =
                    context =>
                    {
                        var accessToken =
                            context.Request
                                .Query[
                                    "access_token"];


                        var path =
                            context.HttpContext
                                .Request
                                .Path;


                        if (
                            !string.IsNullOrEmpty(
                                accessToken)

                            &&

                            path.StartsWithSegments(
                                "/hubs/game")
                        )
                        {
                            context.Token =
                                accessToken;
                        }


                        return Task.CompletedTask;
                    }
            };
    });


//
// =========================================================
// AUTHORIZATION
// =========================================================
//

builder.Services.AddAuthorization();


//
// =========================================================
// CORS
// =========================================================
//

var allowedOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowFrontend",
        policy =>
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
});


//
// =========================================================
// BUILD APP
// =========================================================
//

var app =
    builder.Build();


//
// =========================================================
// SWAGGER
// =========================================================
//

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();


    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint(
            "/swagger/v1/swagger.json",
            "MeetYourBuddy Buddy Games API v1");
    });
}


//
// =========================================================
// HTTPS
// =========================================================
//

app.UseHttpsRedirection();


//
// =========================================================
// CORS
// =========================================================
//

app.UseCors(
    "AllowFrontend");


//
// =========================================================
// AUTHENTICATION
//
// Order is important:
// Authentication BEFORE Authorization
// =========================================================
//

app.UseAuthentication();

app.UseAuthorization();


//
// =========================================================
// CONTROLLERS
// =========================================================
//

app.MapControllers();


//
// =========================================================
// SIGNALR HUB
// =========================================================
//

app.MapHub<GameHub>(
    "/hubs/game");


//
// =========================================================
// HEALTH / ROOT
// =========================================================
//

app.MapGet(
    "/",
    () =>
    {
        return Results.Ok(
            new
            {
                service =
                    "MeetYourBuddy Buddy Games Service",

                status =
                    "Running",

                utcTime =
                    DateTime.UtcNow
            });
    });


//
// =========================================================
// RUN
// =========================================================
//

app.Run();