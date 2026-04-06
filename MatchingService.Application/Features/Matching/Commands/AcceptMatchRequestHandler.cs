using MatchingService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.Matching.Commands.AcceptRequest
{
    public class AcceptMatchRequestHandler :
        IRequestHandler<AcceptMatchRequestCommand, ResponseModel>
    {
        private readonly IMatchingRepository _repository;

        public AcceptMatchRequestHandler(IMatchingRepository repository)
        {
            _repository = repository;
        }

        public async Task<ResponseModel> Handle(
            AcceptMatchRequestCommand request,
            CancellationToken cancellationToken)
        {
            return await _repository.AcceptRequestAsync(request.RequestId);
        }
    }
}