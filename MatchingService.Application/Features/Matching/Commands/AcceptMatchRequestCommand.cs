using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.Matching.Commands.AcceptRequest
{
    public class AcceptMatchRequestCommand : IRequest<ResponseModel>
    {
        public int RequestId { get; set; }
    }
}