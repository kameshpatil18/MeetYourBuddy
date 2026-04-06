using Dapper;
using CategoryService.Application.Interfaces;
using Shared.Common.Models;
using System.Data;

namespace CategoryService.Persistence.Repositories
{
    public class CategoryRepository : ICategoryRepository
    {
        private readonly IDbConnection _db;

        public CategoryRepository(IDbConnection db)
        {
            _db = db;
        }

        public async Task<ResponseModel> GetCategoriesAsync()
        {
            var result = await _db.QueryAsync(
                "Category.GetCategories",
                commandType: CommandType.StoredProcedure
            );

            return new ResponseModel
            {
                Code = 1,
                Message = "Categories fetched successfully",
                Data = result
            };
        }

        public async Task<ResponseModel> SaveUserCategoriesAsync(int userId, List<int> categoryIds)
        {
            var categoryIdsString = string.Join(",", categoryIds);

            await _db.ExecuteAsync(
                "Category.SaveUserCategories",
                new
                {
                    UserId = userId,
                    CategoryIds = categoryIdsString
                },
                commandType: CommandType.StoredProcedure
            );

            return new ResponseModel
            {
                Code = 1,
                Message = "Categories saved successfully"
            };
        }
    }
}