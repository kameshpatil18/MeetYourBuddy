using IdentityService.Application.Interfaces;
using IdentityService.Domain.Entities;
using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.RegisterUser
{
    public class RegisterUserHandler : IRequestHandler<RegisterUserCommand, ResponseModel>
    {
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;

        public RegisterUserHandler(
            IUserRepository userRepository,
            IEmailService emailService)
        {
            _userRepository = userRepository;
            _emailService = emailService;
        }

        public async Task<ResponseModel> Handle(
            RegisterUserCommand request,
            CancellationToken cancellationToken)
        {
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);

            if (existingUser != null)
            {
                return new ResponseModel
                {
                    Code = 0,
                    Message = "User already exists"
                };
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Email = request.Email,
                PasswordHash = hashedPassword,
                FirstName = request.FirstName,
                LastName = request.LastName,
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };

            var id = await _userRepository.AddAsync(user);

            // Generate verification token
            var token = Guid.NewGuid().ToString();

            await _userRepository.SaveEmailVerificationToken(id, token);

            var link = $"http://localhost:5265/api/auth/verify-email?token={token}";

            try
            {
                await _emailService.SendEmailAsync(
                    user.Email,
                    "Verify Email",
                    $"Click here to verify your email: {link}"
                );
            }
            catch (Exception ex)
            {
                return new ResponseModel
                {
                    Code = 0,
                    Message = "User registered but email failed: " + ex.Message
                };
            }
            return new ResponseModel
            {
                Code = 1,
                Message = "Registered successfully. Please verify your email.",
                Data = id
            };
        }
    }
}