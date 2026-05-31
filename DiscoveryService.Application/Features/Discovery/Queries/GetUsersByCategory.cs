using DiscoveryService.Application.Features.Request;
using MediatR;
using Shared.Common.Models;

namespace DiscoveryService.Application.Features.Discovery.Queries.GetUsersByCategory
{
    public sealed record GetUsersByCategoryQuery(GetUserRequest Request) : IRequest<ResponseModel>;
    
}