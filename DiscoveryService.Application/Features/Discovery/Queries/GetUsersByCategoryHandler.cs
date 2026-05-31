using DiscoveryService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;

namespace DiscoveryService.Application.Features.Discovery.Queries.GetUsersByCategory
{
    public class GetUsersByCategoryHandler
        : IRequestHandler<GetUsersByCategoryQuery, ResponseModel>
    {
        private readonly IDiscoveryRepository _repository;

        public GetUsersByCategoryHandler(IDiscoveryRepository repository)
        {
            _repository = repository;
        }

        public async Task<ResponseModel> Handle(
            GetUsersByCategoryQuery request,
            CancellationToken cancellationToken)
        {
            return await _repository.GetUsersByCategoryAsync(request.Request);
        }
    }
}   