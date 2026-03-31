using IdentityService.Application.Features.Auth.DTOs;
using IdentityService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;
using BCrypt.Net;

namespace IdentityService.Application.Features.Auth.Queries.LoginUser
{
    public class LoginUserHandler : IRequestHandler<LoginUserQuery, ResponseModel>
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;

        public LoginUserHandler(
            IUserRepository userRepository,
            IJwtTokenGenerator jwtTokenGenerator)
        {
            _userRepository = userRepository;
            _jwtTokenGenerator = jwtTokenGenerator;
        }

        public async Task<ResponseModel> Handle(
            LoginUserQuery request,
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

            var isPasswordValid = BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.PasswordHash
            );

            if (!isPasswordValid)
            {
                return new ResponseModel
                {
                    Code = 0,
                    Message = "Invalid password"
                };
            }

            var token = _jwtTokenGenerator.GenerateToken(user);

            var response = new LoginResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Token = token
            };

            return new ResponseModel
            {
                Code = 1,
                Message = "Login successful",
                Data = response
            };
        }
    }
}