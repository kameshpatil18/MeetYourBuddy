using Dapper;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Entities;
using ProfileService.Persistence.Contexts;
using Shared.Common.Models;
using System.Data;

namespace ProfileService.Infrastructure.Repositories
{
    public class ProfileRepository : IProfileRepository
    {
        private readonly IDbConnection _connection;

        public ProfileRepository(DapperContext context)
        {
            _connection = context.CreateConnection();
        }

        public async Task<ResponseModel> CreateProfileAsync(UserProfile profile)
        {
            var result = await _connection.QueryFirstOrDefaultAsync<ResponseModel>(
                "Profile.CreateUserProfile",
                new
                {
                    profile.UserId,
                    profile.FirstName,
                    profile.LastName,
                    profile.Gender,
                    profile.DateOfBirth,
                    profile.City,
                    profile.State,
                    profile.Country,
                    profile.Bio,
                    profile.ProfileImage
                },
                commandType: CommandType.StoredProcedure);

            return result ?? new ResponseModel
            {
                Code = 0,
                Message = "Unable to create profile"
            };
        }

        public async Task<ResponseModel> UpdateProfileAsync(UserProfile profile)
        {
            var result = await _connection.QueryFirstOrDefaultAsync<ResponseModel>(
                "Profile.UpdateUserProfile",
                new
                {
                    profile.UserId,
                    profile.FirstName,
                    profile.LastName,
                    profile.Gender,
                    profile.DateOfBirth,
                    profile.City,
                    profile.State,
                    profile.Country,
                    profile.Bio,
                    profile.ProfileImage
                },
                commandType: CommandType.StoredProcedure);

            return result ?? new ResponseModel
            {
                Code = 0,
                Message = "Unable to update profile"
            };
        }

        public async Task<UserProfile?> GetProfileAsync(int userId)
        {
            return await _connection.QueryFirstOrDefaultAsync<UserProfile>(
                "Profile.GetUserProfile",
                new { UserId = userId },
                commandType: CommandType.StoredProcedure);
        }
    }
}