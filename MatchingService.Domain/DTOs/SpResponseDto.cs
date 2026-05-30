using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Domain.DTOs
{
    public class SpResponseDto
    {
        public int Code { get; set; }

        public string Message { get; set; } = string.Empty;

        public int? PostId { get; set; }

        public int? CommentId { get; set; }

        public bool IsLiked { get; set; }

        public int LikeCount { get; set; }

        public int CommentCount { get; set; }
    }
}
