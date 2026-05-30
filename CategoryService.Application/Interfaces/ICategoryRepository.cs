using Shared.Common.Models;

namespace CategoryService.Application.Interfaces
{
    public interface ICategoryRepository
    {
        Task<ResponseModel> GetCategoriesAsync();

        Task<ResponseModel> SaveUserCategoriesAsync(int userId, List<int> categoryIds);
        Task<ResponseModel> GetUserategoriesPrefrences(int userId);
    }
}