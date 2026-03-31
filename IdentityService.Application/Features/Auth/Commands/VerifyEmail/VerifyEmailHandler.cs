using IdentityService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.VerifyEmail
{
    public class VerifyEmailHandler
        : IRequestHandler<VerifyEmailCommand, ResponseModel>
    {
        private readonly IUserRepository _userRepository;

        public VerifyEmailHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<ResponseModel> Handle(
            VerifyEmailCommand request,
            CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByVerificationTokenAsync(request.Token);

            if (user == null)
            {
                return new ResponseModel
                {
                    Code = 0,
                    Message = "Invalid or expired token"
                };
            }

            await _userRepository.VerifyEmailAsync(user.Id);

            await _userRepository.MarkVerificationTokenUsedAsync(request.Token);

            return new ResponseModel
            {
                Code = 1,
                Message = "Email verified successfully"
            };
        }
    }
}