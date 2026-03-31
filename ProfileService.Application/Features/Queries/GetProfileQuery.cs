using MediatR;
using ProfileService.Domain.Entities;

namespace ProfileService.Application.Features.Profile.Queries.GetProfile
{
    public class GetProfileQuery : IRequest<UserProfile?>
    {
        public int UserId { get; set; }
    }
}