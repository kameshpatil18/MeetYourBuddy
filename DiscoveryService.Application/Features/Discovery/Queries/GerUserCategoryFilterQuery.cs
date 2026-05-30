using DiscoveryService.Application.Response;
using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace DiscoveryService.Application.Features.Discovery.Queries
{
    public class GerUserCategoryFilterQuery :IRequest<List<UserCategoryFilterResponse>>
    {
        public string FilterName { get; set; }
    }
}
