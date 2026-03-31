using IdentityService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;
using BCrypt.Net;

namespace IdentityService.Application.Features.Auth.Commands.ResetPassword
{
    public class ResetPasswordHandler
        : IRequestHandler<ResetPasswordCommand, ResponseModel>
    {
        private readonly IUserRepository _userRepository;

        public ResetPasswordHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<ResponseModel> Handle(
            ResetPasswordCommand request,
            CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByResetTokenAsync(request.Token);

            if (user == null)
            {
                return new ResponseModel
                {
                    Code = 0,
                    Message = "Invalid or expired token"
                };
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            await _userRepository.UpdatePasswordAsync(user.Id, hashedPassword);

            await _userRepository.MarkTokenUsedAsync(request.Token);

            return new ResponseModel
            {
                Code = 1,
                Message = "Password reset successfully"
            };
        }
    }
}