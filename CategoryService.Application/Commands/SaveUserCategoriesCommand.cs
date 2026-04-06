using MediatR;
using Shared.Common.Models;
using System.Text.Json.Serialization;

namespace CategoryService.Application.Features.Category.Commands.SaveUserCategories
{
    public class SaveUserCategoriesCommand : IRequest<ResponseModel>
    {
        [JsonIgnore]
        public int UserId { get; set; }

        public List<int> CategoryIds { get; set; }
    }
}