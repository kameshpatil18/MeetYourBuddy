using MatchingService.Application.Features.Matching.Commands.AcceptRequest;
using MatchingService.Application.Features.Matching.Commands.RejectRequest;
using MatchingService.Application.Features.Matching.Commands.SendRequest;
using MatchingService.Application.Features.Matching.Queries;
using MatchingService.Application.Features.Matching.Queries.GetMatches;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Common.Extensions;

namespace MatchingService.API.Controllers
{
    [ApiController]
    [Route("api/matching")]
    [Authorize]
    public class MatchingController : ControllerBase
    {
        private readonly IMediator _mediator;

        public MatchingController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("request")]
        public async Task<IActionResult> SendRequest(SendMatchRequestCommand command)
        {
            command.UserId = User.GetUserId();

            return Ok(await _mediator.Send(command));
        }

        [HttpPost("accept")]
        public async Task<IActionResult> Accept(AcceptMatchRequestCommand command)
        {
            return Ok(await _mediator.Send(command));
        }

        [HttpPost("reject")]
        public async Task<IActionResult> Reject(RejectMatchRequestCommand command)
        {
            return Ok(await _mediator.Send(command));
        }

        [HttpGet("get-matches")]
        public async Task<IActionResult> GetMyMatches()
        {
            var query = new GetMatchesQuery
            {
                UserId = User.GetUserId()
            };

            return Ok(await _mediator.Send(query));
        }
        [HttpGet("get-pending-request")]
        public async Task<IActionResult> GetPendingRequest([FromQuery] int UserId)
        {
          
            return Ok(await _mediator.Send(new GetPendingRequestQuery(User.GetUserId())));
        }
    }
}