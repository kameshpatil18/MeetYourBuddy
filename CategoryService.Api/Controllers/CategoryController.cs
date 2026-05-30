using CategoryService.Application.Features.Category.Commands.SaveUserCategories;
using CategoryService.Application.Features.Category.Queries.GetCategories;
using CategoryService.Application.Queries;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Common.Extensions;
using System.Security.Claims;

namespace CategoryService.API.Controllers
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly IMediator _mediator;

        public CategoryController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("getall")]
        public async Task<IActionResult> GetCategories()
        {
            return Ok(await _mediator.Send(new GetCategoriesQuery()));
        }

        [HttpPost("save-user-categories")]
        public async Task<IActionResult> SaveUserCategories([FromBody] SaveUserCategoriesCommand command)
        {
            command.UserId = User.GetUserId();
            return Ok(await _mediator.Send(command));
        }
        [HttpGet("get-user-category")]
        public async Task<IActionResult> GetUserategoriesPrefrences([FromQuery] int userId)
        {
            return Ok(await _mediator.Send(new GetUserategoriesPrefrencesQuery
            {
                UserId = userId
            }));
        }
    }
}