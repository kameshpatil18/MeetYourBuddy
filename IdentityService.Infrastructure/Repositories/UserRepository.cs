using Dapper;
using IdentityService.Application.Interfaces;
using IdentityService.Domain.Entities;
using IdentityService.Persistence;
using System.Data;

namespace IdentityService.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IDbConnection _connection;

        public UserRepository(DapperContext context)
        {
            _connection = context.CreateConnection();
        }

        public async Task<int> AddAsync(User user)
        {
            var query = @"INSERT INTO Users
                  (Email, PasswordHash, FirstName, LastName, CreatedDate)
                  VALUES
                  (@Email,@PasswordHash,@FirstName,@LastName,@CreatedDate);
                  SELECT CAST(SCOPE_IDENTITY() as int);";

            return await _connection.ExecuteScalarAsync<int>(query, user);
        }

        public async Task<User> GetByEmailAsync(string email)
        {
            var query = "SELECT * FROM Users WHERE Email = @Email";

            return await _connection.QueryFirstOrDefaultAsync<User>(query, new { Email = email });
        }
    }
}