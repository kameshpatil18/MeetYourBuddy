using DiscoveryService.Application.Features.Discovery.Queries.GetNearbyUsers;
using DiscoveryService.Application.Interfaces;
using DiscoveryService.Application.Response;
using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace DiscoveryService.Application.Features.Discovery.Queries
{
    public class GerUserCategoryFilterQuerysHandler
        : IRequestHandler<GerUserCategoryFilterQuery, List<UserCategoryFilterResponse>>
    {
        private readonly IDiscoveryRepository _repository;

        public GerUserCategoryFilterQuerysHandler(IDiscoveryRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<UserCategoryFilterResponse>> Handle(
            GerUserCategoryFilterQuery request,
            CancellationToken cancellationToken)
        {
            return await _repository.GetUserCategoryFilterMetaData(request.FilterName);
        }
    }

}
