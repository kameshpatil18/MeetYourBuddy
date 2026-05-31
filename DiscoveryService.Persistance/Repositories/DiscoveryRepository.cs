using Dapper;
using DiscoveryService.Application.Features.Request;
using DiscoveryService.Application.Interfaces;
using DiscoveryService.Application.Response;
using DiscoveryService.Domain.Entities;
using DiscoveryService.Persistence.Contexts;
using Shared.Common.Models;
using System.Data;
using Newtonsoft.Json;
namespace DiscoveryService.Infrastructure.Repositories
{
    public class DiscoveryRepository : IDiscoveryRepository
    {
        private readonly IDbConnection _connection;

        public DiscoveryRepository(DapperContext context)
        {
            _connection = context.CreateConnection();
        }

        public async Task<ResponseModel> GetUsersByCategoryAsync(GetUserRequest request)
        {
            var result = await _connection.QueryMultipleAsync(
                                     "Discovery.GetUsersByCategory",
                                     new
                                     {
                                         UserId = request.UserId,
                                         CategoriesId = JsonConvert.SerializeObject(request.CatergoriesId),
                                         Search = request.Search,
                                         Filters = JsonConvert.SerializeObject(request.Filters),
                                         PageNumber = request.PageNumber,
                                         PageSize = request.PageSize
                                     },
                                     commandType: CommandType.StoredProcedure);

            var totalCount = await result.ReadFirstAsync<int>();

            var users = (await result.ReadAsync<GetUserCatergoryResponse>()).ToList();

            var pagedUsers = users
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();
            return new ResponseModel
            {
                Code = 1,
                Message = "Users fetched successfully",
                Data = pagedUsers,
                TotalCount = totalCount,

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