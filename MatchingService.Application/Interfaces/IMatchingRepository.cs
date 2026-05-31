using Shared.Common.Models;

namespace MatchingService.Application.Interfaces
{
    public interface IMatchingRepository
    {
        Task<ResponseModel> SendRequestAsync(int fromUserId, int toUserId);

        Task<ResponseModel> AcceptRequestAsync(int requestId);

        Task<ResponseModel> RejectRequestAsync(int requestId);

        Task<ResponseModel> GetMatchesAsync(int userId);
        Task<ResponseModel> GetPendingRequest(int userId);
    }
}