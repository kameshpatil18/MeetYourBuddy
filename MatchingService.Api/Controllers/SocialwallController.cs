using MatchingService.Application.Features.Socialwall.Commands;
using MatchingService.Application.Features.Socialwall.Queries;
using MatchingService.Application.Features.SocialWall.Commands;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Common.Extensions;


namespace MatchingService.API.Controllers
{
    [ApiController]
    [Route("api/SocialWall")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class SocialwallController : ControllerBase
    {
        private readonly IMediator _mediator;

        public SocialwallController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("posts")]
        public async Task<IActionResult> GetAllPosts(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            var query = new GetSocialWallPostsQuery
            {
                UserId = User.GetUserId(),
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpPost("posts")]
        public async Task<IActionResult> CreatePost([FromBody] CreateSocialWallPostCommand command)
        {
            command.UserId = User.GetUserId();

            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPost("posts/{postId}/like")]
        public async Task<IActionResult> LikePost(int postId)
        {
            var command = new LikeSocialWallPostCommand
            {
                PostId = postId,
                UserId = User.GetUserId()
            };

            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPost("posts/{postId}/comments")]
        public async Task<IActionResult> AddComment(
            int postId,
            [FromBody] AddSocialWallCommentCommand command)
        {
            command.PostId = postId;
            command.UserId = User.GetUserId();

            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("posts/{postId}/comments")]
        public async Task<IActionResult> GetComments(int postId)
        {
            var query = new GetSocialWallCommentsQuery
            {
                PostId = postId,
                UserId = User.GetUserId()
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
    }
}