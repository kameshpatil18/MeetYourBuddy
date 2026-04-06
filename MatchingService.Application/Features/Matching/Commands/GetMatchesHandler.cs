using MatchingService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.Matching.Queries.GetMatches
{
    public class GetMatchesHandler :
        IRequestHandler<GetMatchesQuery, ResponseModel>
    {
        private readonly IMatchingRepository _repository;

        public GetMatchesHandler(IMatchingRepository repository)
        {
            _repository = repository;
        }

        public async Task<ResponseModel> Handle(
            GetMatchesQuery request,
            CancellationToken cancellationToken)
        {
            return await _repository.GetMatchesAsync(request.UserId);
        }
    }
}