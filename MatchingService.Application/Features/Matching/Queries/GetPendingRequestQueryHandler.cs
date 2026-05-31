using MatchingService.Application.Features.Matching.Queries.GetMatches;
using MatchingService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Application.Features.Matching.Queries
{
    public class GetPendingRequestQueryHandler : IRequestHandler<GetPendingRequestQuery, ResponseModel>
    {
        private readonly IMatchingRepository _repository;

        public GetPendingRequestQueryHandler(IMatchingRepository repository)
        {
            _repository = repository;
        }

        public async Task<ResponseModel> Handle(GetPendingRequestQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetPendingRequest(request.UserId);
        }
    }
}
