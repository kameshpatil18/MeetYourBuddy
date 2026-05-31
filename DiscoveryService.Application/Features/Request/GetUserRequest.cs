using System;
using System.Collections.Generic;
using System.Text;

namespace DiscoveryService.Application.Features.Request
{
    public class GetUserRequest
    {
        public int UserId { get; set; }
        public List<int> CatergoriesId { get; set; }
        public string Search { get; set; }
        public List<UserFilter> Filters { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    public class UserFilter
    {
        public string FieldName { get; set; }
        public string FieldValue { get; set; }
    }
}
