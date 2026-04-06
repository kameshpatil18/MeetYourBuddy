using MediatR;

namespace MeetYourBuddy.ChatService.Application.Features.SendMessage
{
    public class SendMessageCommand : IRequest<int>
    {
        public int SenderId { get; set; }
        public int ReceiverId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}