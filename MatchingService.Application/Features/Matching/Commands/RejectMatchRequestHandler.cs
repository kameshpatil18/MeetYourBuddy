using MatchingService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.Matching.Commands.RejectRequest
{
    public class RejectMatchRequestHandler :
        IRequestHandler<RejectMatchRequestCommand, ResponseModel>
    {
        private readonly IMatchingRepository _repository;

        public RejectMatchRequestHandler(IMatchingRepository repository)
        {
            _repository = repository;
        }

        public async Task<ResponseModel> Handle(
            RejectMatchRequestCommand request,
            CancellationToken cancellationToken)
        {
            return await _repository.RejectRequestAsync(request.RequestId);
        }
    }
}