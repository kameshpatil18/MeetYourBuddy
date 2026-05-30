using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Application.Features.Socialwall.Commands
{
    public class AddSocialWallCommentCommand : IRequest<ResponseModel>
    {
        public int PostId { get; set; }

        public int UserId { get; set; }

        public string Comment { get; set; } = string.Empty;
    }
}
