using DiscoveryService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace DiscoveryService.Application.Features.Discovery.Queries.GetNearbyUsers
{
    public class GetNearbyUsersHandler
        : IRequestHandler<GetNearbyUsersQuery, ResponseModel>
    {
        private readonly IDiscoveryRepository _repository;

        public GetNearbyUsersHandler(IDiscoveryRepository repository)
        {
            _repository = repository;
        }

        public async Task<ResponseModel> Handle(
            GetNearbyUsersQuery request,
            CancellationToken cancellationToken)
        {
            return await _repository.GetNearbyUsersAsync(request.UserId);
        }
    }
}