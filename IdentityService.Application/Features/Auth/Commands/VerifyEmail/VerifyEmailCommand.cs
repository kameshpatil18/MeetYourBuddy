using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.VerifyEmail
{
    public class VerifyEmailCommand : IRequest<ResponseModel>
    {
        public string Token { get; set; }
    }
}