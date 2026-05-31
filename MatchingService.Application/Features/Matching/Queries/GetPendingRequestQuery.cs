using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Application.Features.Matching.Queries
{
    public sealed record GetPendingRequestQuery(int UserId) : IRequest<ResponseModel>;
    
}
