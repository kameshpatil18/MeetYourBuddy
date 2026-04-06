using MediatR;
using MeetYourBuddy.ChatService.Domain.Entities;

namespace MeetYourBuddy.ChatService.Application.Features.GetChatHistory
{
    public class GetChatHistoryQuery : IRequest<List<Message>>
    {
        public int User1Id { get; set; }
        public int User2Id { get; set; }
    }
}