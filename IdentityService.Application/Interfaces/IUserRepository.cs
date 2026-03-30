using IdentityService.Domain.Entities;

namespace IdentityService.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<int> AddAsync(User user);

        Task<User> GetByEmailAsync(string email);
    }
}