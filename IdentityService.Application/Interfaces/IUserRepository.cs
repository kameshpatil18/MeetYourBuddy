using IdentityService.Domain.Entities;

namespace IdentityService.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<int> AddAsync(User user);

        Task<User?> GetByEmailAsync(string email);

        Task SaveEmailVerificationToken(int userId, string token);

        Task<User?> GetByVerificationTokenAsync(string token);

        Task VerifyEmailAsync(int userId);

        Task MarkVerificationTokenUsedAsync(string token);

        Task SavePasswordResetToken(int userId, string token);

        Task<User?> GetByResetTokenAsync(string token);

        Task UpdatePasswordAsync(int userId, string passwordHash);

        Task MarkTokenUsedAsync(string token);
    }
}