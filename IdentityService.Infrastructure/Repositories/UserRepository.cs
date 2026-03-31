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
            var query = @"
                INSERT INTO [Identity].[Users]
                (Email, PasswordHash, FirstName, LastName, IsActive, CreatedDate)
                VALUES
                (@Email, @PasswordHash, @FirstName, @LastName, @IsActive, @CreatedDate);

                SELECT CAST(SCOPE_IDENTITY() as int);
            ";

            var id = await _connection.ExecuteScalarAsync<int>(query, user);
            return id;
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            var query = @"
                SELECT *
                FROM [Identity].[Users]
                WHERE Email = @Email
            ";

            return await _connection.QueryFirstOrDefaultAsync<User>(
                query,
                new { Email = email });
        }

        public async Task SaveEmailVerificationToken(int userId, string token)
        {
            var query = @"
                INSERT INTO [Identity].[EmailVerification]
                (UserId, Token, ExpiryDate)
                VALUES
                (@UserId, @Token, DATEADD(MINUTE, 30, GETUTCDATE()))
            ";

            await _connection.ExecuteAsync(query, new
            {
                UserId = userId,
                Token = token
            });
        }

        public async Task<User?> GetByVerificationTokenAsync(string token)
        {
            var query = @"
                SELECT U.*
                FROM [Identity].[EmailVerification] EV
                INNER JOIN [Identity].[Users] U
                ON EV.UserId = U.Id
                WHERE EV.Token = @Token
                AND EV.IsUsed = 0
                AND EV.ExpiryDate > GETUTCDATE()
            ";

            return await _connection.QueryFirstOrDefaultAsync<User>(
                query,
                new { Token = token });
        }

        public async Task VerifyEmailAsync(int userId)
        {
            var query = @"
                UPDATE [Identity].[Users]
                SET IsEmailVerified = 1
                WHERE Id = @UserId
            ";

            await _connection.ExecuteAsync(query, new { UserId = userId });
        }

        public async Task MarkVerificationTokenUsedAsync(string token)
        {
            var query = @"
                UPDATE [Identity].[EmailVerification]
                SET IsUsed = 1
                WHERE Token = @Token
            ";

            await _connection.ExecuteAsync(query, new { Token = token });
        }

        public async Task SavePasswordResetToken(int userId, string token)
        {
            var query = @"
                INSERT INTO [Identity].[PasswordReset]
                (UserId, Token, ExpiryDate)
                VALUES
                (@UserId, @Token, DATEADD(MINUTE, 30, GETUTCDATE()))
            ";

            await _connection.ExecuteAsync(query, new
            {
                UserId = userId,
                Token = token
            });
        }

        public async Task<User?> GetByResetTokenAsync(string token)
        {
            var query = @"
                SELECT U.*
                FROM [Identity].[PasswordReset] PR
                INNER JOIN [Identity].[Users] U
                ON PR.UserId = U.Id
                WHERE PR.Token = @Token
                AND PR.IsUsed = 0
                AND PR.ExpiryDate > GETUTCDATE()
            ";

            return await _connection.QueryFirstOrDefaultAsync<User>(
                query,
                new { Token = token });
        }

        public async Task UpdatePasswordAsync(int userId, string passwordHash)
        {
            var query = @"
                UPDATE [Identity].[Users]
                SET PasswordHash = @PasswordHash
                WHERE Id = @UserId
            ";

            await _connection.ExecuteAsync(query, new
            {
                UserId = userId,
                PasswordHash = passwordHash
            });
        }

        public async Task MarkTokenUsedAsync(string token)
        {
            var query = @"
                UPDATE [Identity].[PasswordReset]
                SET IsUsed = 1
                WHERE Token = @Token
            ";

            await _connection.ExecuteAsync(query, new { Token = token });
        }
    }
}