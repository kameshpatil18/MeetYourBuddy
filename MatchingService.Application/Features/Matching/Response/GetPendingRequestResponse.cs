using System;
using System.Collections.Generic;
using System.Text;

namespace MatchingService.Application.Features.Matching.Response
{
    public class GetPendingRequestResponse
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string City { get; set; }
        public string ProfileImage {  get; set; }
    }
}
