using Dapper;
using DiscoveryService.Application.Interfaces;
using DiscoveryService.Application.Response;
using DiscoveryService.Domain.Entities;
using DiscoveryService.Persistence.Contexts;
using Shared.Common.Models;
using System.Data;

namespace DiscoveryService.Infrastructure.Repositories
{
    public class DiscoveryRepository : IDiscoveryRepository
    {
        private readonly IDbConnection _connection;

        public DiscoveryRepository(DapperContext context)
        {
            _connection = context.CreateConnection();
        }

        public async Task<ResponseModel> GetUsersByCategoryAsync(int userId, int categoryId)
        {
            var result = await _connection.QueryAsync<DiscoveryUser>(
                "Discovery.GetUsersByCategory",
                new
                {
                    UserId = userId,
                    CategoryId = categoryId
                },
                commandType: CommandType.StoredProcedure);

            return new ResponseModel
            {
                Code = 1,
                Message = "Users fetched successfully",
                Data = result
            };
        }

        public async Task<ResponseModel> GetNearbyUsersAsync(int userId)
        {
            var result = await _connection.QueryAsync<DiscoveryUser>(
                "Discovery.GetNearbyUsers",
                new
                {
                    UserId = userId
                },
                commandType: CommandType.StoredProcedure);

            return new ResponseModel
            {
                Code = 1,
                Message = "Nearby users fetched successfully",
                Data = result
            };
        }
        public async Task<List<UserCategoryFilterResponse>> GetUserCategoryFilterMetaData(string filterName)
        {
            var result = await _connection.QueryAsync<UserCategoryFilterResponse>(
                "Discovery.GetUserCategoryFilterMetaData",
                new
                {
                    FilterName = filterName
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }
    }
}