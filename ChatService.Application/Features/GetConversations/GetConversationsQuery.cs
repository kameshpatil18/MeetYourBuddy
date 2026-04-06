using MediatR;
using MeetYourBuddy.ChatService.Domain.Entities;

namespace MeetYourBuddy.ChatService.Application.Features.GetConversations
{
    public class GetConversationsQuery : IRequest<List<ConversationDto>>
    {
        public int UserId { get; set; }
    }
}