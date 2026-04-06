using CategoryService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace CategoryService.Application.Features.Category.Commands.SaveUserCategories
{
    public class SaveUserCategoriesHandler : IRequestHandler<SaveUserCategoriesCommand, ResponseModel>
    {
        private readonly ICategoryRepository _categoryRepository;

        public SaveUserCategoriesHandler(ICategoryRepository categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<ResponseModel> Handle(
            SaveUserCategoriesCommand request,
            CancellationToken cancellationToken)
        {
            return await _categoryRepository.SaveUserCategoriesAsync(
                request.UserId,
                request.CategoryIds
            );
        }
    }
}