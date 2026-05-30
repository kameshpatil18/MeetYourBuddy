using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Domain.DTOs
{
    public class SocialWallPostDto
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string? UserPhoto { get; set; }

        public string Content { get; set; } = string.Empty;

        public string? ImageUrl { get; set; }

        public int LikeCount { get; set; }

        public int CommentCount { get; set; }

        public bool IsLikedByMe { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
