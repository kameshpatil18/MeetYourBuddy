using MediatR;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Entities;

namespace ProfileService.Application.Features.Profile.Queries.GetProfile
{
    public class GetProfileHandler : IRequestHandler<GetProfileQuery, UserProfile?>
    {
        private readonly IProfileRepository _profileRepository;

        public GetProfileHandler(IProfileRepository profileRepository)
        {
            _profileRepository = profileRepository;
        }

        public async Task<UserProfile?> Handle(GetProfileQuery request, CancellationToken cancellationToken)
        {
            return await _profileRepository.GetProfileAsync(request.UserId);
        }
    }
}