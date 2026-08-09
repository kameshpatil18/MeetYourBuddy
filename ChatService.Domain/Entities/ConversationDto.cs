
    namespace MeetYourBuddy.ChatService.Domain.Entities
    {
        public class ConversationDto
        {
            public int ConversationId { get; set; }
            public int OtherUserId { get; set; }

            public string OtherUserName { get; set; } = string.Empty;

            public string LastMessage { get; set; } = string.Empty;
            public DateTime? LastMessageTime { get; set; }
        }
    }