using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Application.Features.Socialwall.Queries
{
    public class GetSocialWallPostsQuery : IRequest<ResponseModel>
    {
        public int UserId { get; set; }

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
