using CategoryService.Application.Features.Category.Commands.SaveUserCategories;
using CategoryService.Application.Features.Category.Queries.GetCategories;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Common.Extensions;
using System.Security.Claims;

namespace CategoryService.API.Controllers
{
    [ApiController]
    [Route("api/categories")]
    [Authorize]
    public class CategoryController : ControllerBase
    {
        private readonly IMediator _mediator;

        public CategoryController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetCategories()
        {
            return Ok(await _mediator.Send(new GetCategoriesQuery()));
        }

        [HttpPost]
        public async Task<IActionResult> SaveUserCategories(SaveUserCategoriesCommand command)
        {
            command.UserId = User.GetUserId();

            return Ok(await _mediator.Send(command));
        }
    }
}