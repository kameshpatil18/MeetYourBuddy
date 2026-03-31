using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Queries.LoginUser
{
    public class LoginUserQuery : IRequest<ResponseModel>
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}