using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Domain.DTOs
{
    public class SocialWallCommentDto
    {
        public int Id { get; set; }

        public int PostId { get; set; }

        public int UserId { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string? UserPhoto { get; set; }

        public string Comment { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }
    }
}
