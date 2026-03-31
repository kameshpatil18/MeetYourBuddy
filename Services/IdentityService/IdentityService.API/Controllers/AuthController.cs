using IdentityService.Application.Features.Auth.Commands.ForgotPassword;
using IdentityService.Application.Features.Auth.Commands.RegisterUser;
using IdentityService.Application.Features.Auth.Commands.ResetPassword;
using IdentityService.Application.Features.Auth.Commands.VerifyEmail;
using IdentityService.Application.Features.Auth.Queries.LoginUser;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IMediator _mediator;

        public AuthController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterUserCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginUserQuery query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            return Ok(new
            {
                message = "Authorized user",
                user = User.Identity?.Name,
                claims = User.Claims.Select(x => new { x.Type, x.Value })
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            var result = await _mediator.Send(new VerifyEmailCommand
            {
                Token = token
            });

            return Ok(result);
        }
    }
}