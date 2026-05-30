using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Application.Features.Socialwall.Queries
{
    public class GetSocialWallCommentsQuery : IRequest<ResponseModel>
    {
        public int PostId { get; set; }

        public int UserId { get; set; }
    }
}
