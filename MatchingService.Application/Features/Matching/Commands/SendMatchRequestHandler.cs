using MatchingService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.Matching.Commands.SendRequest
{
    public class SendMatchRequestHandler :
        IRequestHandler<SendMatchRequestCommand, ResponseModel>
    {
        private readonly IMatchingRepository _repository;

        public SendMatchRequestHandler(IMatchingRepository repository)
        {
            _repository = repository;
        }

        public async Task<ResponseModel> Handle(
            SendMatchRequestCommand request,
            CancellationToken cancellationToken)
        {
            return await _repository.SendRequestAsync(
                request.UserId,
                request.TargetUserId
            );
        }
    }
}