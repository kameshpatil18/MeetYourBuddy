using DiscoveryService.Application.Features.Discovery.Queries;
using DiscoveryService.Application.Features.Discovery.Queries.GetNearbyUsers;
using DiscoveryService.Application.Features.Discovery.Queries.GetUsersByCategory;
using DiscoveryService.Application.Features.Request;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Common.Extensions;

namespace DiscoveryService.API.Controllers
{
    [ApiController]
    [Route("api/discovery")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DiscoveryController : ControllerBase
    {
        private readonly IMediator _mediator;

        public DiscoveryController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("category-search")]
        public async Task<IActionResult> GetUsersByCategory([FromBody] GetUserRequest request)
        {
            var query = new GetUsersByCategoryQuery(request);
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