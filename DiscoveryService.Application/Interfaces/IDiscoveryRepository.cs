using Shared.Common.Models;

namespace DiscoveryService.Application.Interfaces
{
    public interface IDiscoveryRepository
    {
        Task<ResponseModel> GetUsersByCategoryAsync(int userId, int categoryId);

        Task<ResponseModel> GetNearbyUsersAsync(int userId);
    }
}