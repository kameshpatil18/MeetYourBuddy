using IdentityService.Domain.Entities;

namespace IdentityService.Application.Interfaces
{
    public interface IJwtTokenGenerator
    {
        string GenerateToken(User user);
    }
}