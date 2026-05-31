using System;
using System.Collections.Generic;
using System.Text;

namespace DiscoveryService.Application.Response
{
    public class GetUserCatergoryResponse
    {
        public int Id { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public string City { get; set; }

        public string ProfileImage { get; set; }

        public string Gender { get; set; }

        public string State { get; set; }

        public string Country { get; set; }
        public string Bio {  get; set; }
    }
}
