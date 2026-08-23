using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Application.Features.Matching.Response
{
    public class GetPendingRequestResponse
    {
        public int RequestId { get; set; }

        public int UserId { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public string City { get; set; }

        public string ProfileImage { get; set; }

        public string Status { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
