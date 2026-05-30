using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using ProfileService.Application.Features.Profile.Commands.CreateProfile;
using ProfileService.Application.Features.Profile.Commands.UpdateProfile;
using ProfileService.Application.Features.Profile.Queries.GetProfile;
using System.Security.Claims;

namespace ProfileService.API.Controllers
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController : ControllerBase
    {
        private readonly IMediator _mediator;

        public ProfileController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create(CreateProfileCommand command)
        {
            var userId = User.FindFirst("sub")?.Value
          ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            command.UserId = int.Parse(userId);

            var result = await _mediator.Send(command);

            return Ok(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update(UpdateProfileCommand command)
        {

            var result = await _mediator.Send(command);

            return Ok(result);
        }

        [HttpGet("me/{userId}")]
        public async Task<IActionResult> Get(int userId)
        {
            var result = await _mediator.Send(
                new GetProfileQuery
                {
                    UserId = userId
                });

            return Ok(result);
        }
    }
}