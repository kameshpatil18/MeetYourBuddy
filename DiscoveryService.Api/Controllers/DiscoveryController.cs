using DiscoveryService.Application.Features.Discovery.Queries;
using DiscoveryService.Application.Features.Discovery.Queries.GetNearbyUsers;
using DiscoveryService.Application.Features.Discovery.Queries.GetUsersByCategory;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Common.Extensions;

namespace DiscoveryService.API.Controllers
{
    [ApiController]
    [Route("api/discovery")]
    [Authorize]
    public class DiscoveryController : ControllerBase
    {
        private readonly IMediator _mediator;

        public DiscoveryController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetUsersByCategory(int categoryId)
        {
            var query = new GetUsersByCategoryQuery
            {
                CategoryId = categoryId,
                UserId = User.GetUserId()
            };

            return Ok(await _mediator.Send(query));
        }

        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearbyUsers()
        {
            var query = new GetNearbyUsersQuery
            {
                UserId = User.GetUserId()
            };

            return Ok(await _mediator.Send(query));
        }
        [HttpGet("filter")]
        public async Task<IActionResult> GerUserCategoryFilter([FromQuery] string filterName)
        {
            var query = new GerUserCategoryFilterQuery
            {
                FilterName = filterName
            };
            return Ok(await _mediator.Send(query));
        }
    }
}