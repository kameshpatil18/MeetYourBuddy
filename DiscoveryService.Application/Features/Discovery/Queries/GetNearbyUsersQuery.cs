using MediatR;
using Shared.Common.Models;

namespace DiscoveryService.Application.Features.Discovery.Queries.GetNearbyUsers
{
    public class GetNearbyUsersQuery : IRequest<ResponseModel>
    {
        public int UserId { get; set; }
    }
}