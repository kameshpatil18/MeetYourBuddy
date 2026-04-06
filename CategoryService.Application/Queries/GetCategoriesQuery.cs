using MediatR;
using Shared.Common.Models;

namespace CategoryService.Application.Features.Category.Queries.GetCategories
{
    public class GetCategoriesQuery : IRequest<ResponseModel>
    {
    }
}