using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.SocialWall.Commands
{
    public class CreateSocialWallPostCommand : IRequest<ResponseModel>
    {
        public int UserId { get; set; }

        public string Content { get; set; } = string.Empty;

        public string? ImageUrl { get; set; }
    }
}