namespace MeetYourBuddy.ChatService.Domain.Entities
{
    public class AiChatRequest
    {
        public string Category { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;
    }
}