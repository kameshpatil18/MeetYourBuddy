using MediatR;
using MeetYourBuddy.ChatService.Application.Features.GetChatHistory;
using MeetYourBuddy.ChatService.Application.Features.GetConversations;
using MeetYourBuddy.ChatService.Application.Features.SendMessage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MeetYourBuddy.ChatService.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly IMediator _mediator;

        public ChatController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageCommand command)
        {
            var loggedInUserId = GetLoggedInUserId();

            if (loggedInUserId <= 0)
                return Unauthorized("Invalid user token.");

            if (command.ReceiverId <= 0)
                return BadRequest("ReceiverId is required.");

            if (string.IsNullOrWhiteSpace(command.Message))
                return BadRequest("Message is required.");

            command.SenderId = loggedInUserId;

            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("history/{otherUserId}")]
        public async Task<IActionResult> GetChatHistory(int otherUserId)
        {
            var loggedInUserId = GetLoggedInUserId();

            if (loggedInUserId <= 0)
                return Unauthorized("Invalid user token.");

            if (otherUserId <= 0)
                return BadRequest("otherUserId is required.");

            var query = new GetChatHistoryQuery
            {
                User1Id = loggedInUserId,
                User2Id = otherUserId
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var loggedInUserId = GetLoggedInUserId();

            if (loggedInUserId <= 0)
                return Unauthorized("Invalid user token.");

            var query = new GetConversationsQuery
            {
                UserId = loggedInUserId
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }

        private int GetLoggedInUserId()
        {
            var userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                User.FindFirst("sub")?.Value;

            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }
    }
}