using MediatR;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Entities;
using Shared.Common.Models;

namespace ProfileService.Application.Features.Profile.Commands.UpdateProfile
{
    public class UpdateProfileHandler : IRequestHandler<UpdateProfileCommand, ResponseModel>
    {
        private readonly IProfileRepository _profileRepository;

        public UpdateProfileHandler(IProfileRepository profileRepository)
        {
            _profileRepository = profileRepository;
        }

        public async Task<ResponseModel> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
        {
            var profile = new UserProfile
            {
                UserId = request.UserId,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Gender = request.Gender,
                DateOfBirth = request.DateOfBirth,
                City = request.City,
                State = request.State,
                Country = request.Country,
                Bio = request.Bio,
                ProfileImage = request.ProfileImage
            };

            return await _profileRepository.UpdateProfileAsync(profile);
        }
    }
}