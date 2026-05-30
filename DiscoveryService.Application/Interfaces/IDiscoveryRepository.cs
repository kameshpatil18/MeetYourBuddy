using DiscoveryService.Application.Response;

namespace DiscoveryService.Application.Interfaces
{
    public interface IDiscoveryRepository
    {
        Task<Shared.Common.Models.ResponseModel> GetUsersByCategoryAsync(int userId, int categoryId);

        Task<Shared.Common.Models.ResponseModel> GetNearbyUsersAsync(int userId);
        Task<List<UserCategoryFilterResponse>> GetUserCategoryFilterMetaData(string filterName);
    }
}