using ProfileService.Domain.Entities;
using Shared.Common.Models;

namespace ProfileService.Application.Interfaces
{
    public interface IProfileRepository
    {
        Task<ResponseModel> CreateProfileAsync(UserProfile profile);
        Task<ResponseModel> UpdateProfileAsync(UserProfile profile);
        Task<UserProfile?> GetProfileAsync(int userId);
    }
}