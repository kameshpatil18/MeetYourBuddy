using System;
using System.Collections.Generic;
using System.Text;

namespace ChatService.Domain.Entities
{
    public class AiChatResponse
    {
        public string Category { get; set; } = string.Empty;

        public string Reply { get; set; } = string.Empty;
    }
}
