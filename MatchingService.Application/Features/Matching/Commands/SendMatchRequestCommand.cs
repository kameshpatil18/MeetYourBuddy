using MediatR;
using Shared.Common.Models;
using System.Text.Json.Serialization;

namespace MatchingService.Application.Features.Matching.Commands.SendRequest
{
    public class SendMatchRequestCommand : IRequest<ResponseModel>
    {
        public int TargetUserId { get; set; }

        [JsonIgnore]
        public int UserId { get; set; }
    }
}