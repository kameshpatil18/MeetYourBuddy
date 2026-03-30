using IdentityService.Application.Features.Auth.Commands.RegisterUser;
using IdentityService.Application.Interfaces;
using IdentityService.Infrastructure.Repositories;
using IdentityService.Persistence;
using MediatR;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(RegisterUserCommand).Assembly);
});

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddSingleton<DapperContext>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();