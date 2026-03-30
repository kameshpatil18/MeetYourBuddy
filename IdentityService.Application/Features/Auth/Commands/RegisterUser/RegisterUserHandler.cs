using IdentityService.Application.Interfaces;
using IdentityService.Domain.Entities;
using MediatR;
using Shared.Common.Models;

namespace IdentityService.Application.Features.Auth.Commands.RegisterUser
{
    public class RegisterUserHandler : IRequestHandler<RegisterUserCommand, ResponseModel>
    {
        private readonly IUserRepository _userRepository;

        public RegisterUserHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<ResponseModel> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
        {
            var user = new User
            {
                Email = request.Email,
                PasswordHash = request.Password,
                FirstName = request.FirstName,
                LastName = request.LastName,
                CreatedDate = DateTime.UtcNow
            };

            var id = await _userRepository.AddAsync(user);

            return new ResponseModel
            {
                Code = 1,
                Message = "Registered successfully",
                Data = id
            };
        }
    }
}