using MediatR;
using Shared.Common.Models;

namespace MatchingService.Application.Features.Matching.Commands.RejectRequest
{
    public class RejectMatchRequestCommand : IRequest<ResponseModel>
    {
        public int RequestId { get; set; }
    }
}