using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.Matching.Queries.GetMatches
{
    public class GetMatchesQuery : IRequest<ResponseModel>
    {
        public int UserId { get; set; }
    }
}