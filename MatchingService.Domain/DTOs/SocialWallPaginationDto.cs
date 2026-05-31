using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Domain.DTOs
{
    public class SocialWallPaginationDto
    {
        public int TotalCount { get; set; }

        public int PageNumber { get; set; }

        public int PageSize { get; set; }

        public int TotalPages { get; set; }
    }
}
