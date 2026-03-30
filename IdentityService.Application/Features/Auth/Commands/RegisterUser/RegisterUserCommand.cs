using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.RegisterUser
{
    public class RegisterUserCommand : IRequest<ResponseModel>
    {
        public string Email { get; set; }

        public string Password { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }
    }
}