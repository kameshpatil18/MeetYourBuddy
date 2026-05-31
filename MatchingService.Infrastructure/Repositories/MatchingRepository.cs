using Dapper;
using MatchingService.Application.Features.Matching.Response;
using MatchingService.Application.Interfaces;
using MatchingService.Persistance.Contexts;
using Shared.Common.Models;
using System.Data;
namespace MatchingService.Infrastructure.Repositories
{
    public class MatchingRepository : IMatchingRepository
    {
        private readonly IDbConnection _connection;

        public MatchingRepository(DapperContext context)
        {
            _connection = context.CreateConnection();
        }

        public async Task<ResponseModel> SendRequestAsync(int fromUserId, int toUserId)
        {
            return await _connection.QueryFirstOrDefaultAsync<ResponseModel>(
                "Matching.SendMatchRequest",
                new
                {
                    FromUserId = fromUserId,
                    ToUserId = toUserId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ResponseModel> AcceptRequestAsync(int requestId)
        {
            return await _connection.QueryFirstOrDefaultAsync<ResponseModel>(
                "Matching.AcceptMatchRequest",
                new
                {
                    RequestId = requestId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ResponseModel> GetMatchesAsync(int userId)
        {
            var result = await _connection.QueryAsync(
                "Matching.GetMyMatches",
                new { UserId = userId },
                commandType: CommandType.StoredProcedure);

            return new ResponseModel
            {
                Code = 1,
                Message = "Matches fetched successfully",
                Data = result
            };
        }

        public async Task<ResponseModel> RejectRequestAsync(int requestId)
        {
            return await _connection.QueryFirstOrDefaultAsync<ResponseModel>(
                "Matching.RejectMatchRequest",
                new { RequestId = requestId },
                commandType: CommandType.StoredProcedure);
        }
        public async Task<ResponseModel> GetPendingRequest(int userId)
        {
            var result = await _connection.QueryAsync<GetPendingRequestResponse>(
                "Matching.GetNotification",
                new { UserId = userId },
                commandType: CommandType.StoredProcedure);
               
            var userList = result.ToList();
            return new ResponseModel
            {
                Code = 1,
                Message = "Matches fetched successfully",
                Data = userList,
                TotalCount = userList.Count()
            };
        }
    }
}