using MediatR;
using Shared.Common.Models;

namespace DiscoveryService.Application.Features.Discovery.Queries.GetUsersByCategory
{
    public class GetUsersByCategoryQuery : IRequest<ResponseModel>
    {
        public int CategoryId { get; set; }

        public int UserId { get; set; }
    }
}