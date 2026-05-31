using IdentityService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.ForgotPassword
{
    public class ForgotPasswordHandler
        : IRequestHandler<ForgotPasswordCommand, ResponseModel>
    {
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;

        public ForgotPasswordHandler(
            IUserRepository userRepository,
            IEmailService emailService)
        {
            _userRepository = userRepository;
            _emailService = emailService;
        }

        public async Task<ResponseModel> Handle(
            ForgotPasswordCommand request,
            CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);

            if (user == null)
            {
                return new ResponseModel
                {
                    Code = 0,
                    Message = "User not found"
                };
            }

            var token = Guid.NewGuid().ToString();
            await _userRepository.SavePasswordResetToken(user.Id, token);
            var resetLink =
                $"http://localhost:3000/reset-password?token={token}";

            var emailBody = $@"
                <h3>Reset Password</h3>
                <p>Click below link to reset password</p>
                <a href='{resetLink}'>Reset Password</a>
                <br/>
                <p>This link expires in 15 minutes</p>
            ";

            await _emailService.SendEmailAsync(
                user.Email,
                "Reset Password",
                emailBody
            );

            return new ResponseModel
            {
                Code = 1,
                Message = "Reset password email sent"
            };
        }
    }
}