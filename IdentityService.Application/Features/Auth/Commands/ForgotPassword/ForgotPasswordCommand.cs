using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.ForgotPassword
{
    public class ForgotPasswordCommand : IRequest<ResponseModel>
    {
        public string Email { get; set; }
    }
}