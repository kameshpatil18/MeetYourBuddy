using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.ResetPassword
{
    public class ResetPasswordCommand : IRequest<ResponseModel>
    {
        public string Token { get; set; }
        public string Password { get; set; }
    }
}