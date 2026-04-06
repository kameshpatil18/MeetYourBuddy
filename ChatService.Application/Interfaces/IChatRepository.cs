using MeetYourBuddy.ChatService.Domain.Entities;

namespace MeetYourBuddy.ChatService.Application.Interfaces
{
    public interface IChatRepository
    {
        Task<int> SendMessageAsync(int senderId, int receiverId, string message);
        Task<List<Message>> GetChatHistoryAsync(int user1Id, int user2Id);
        Task<List<ConversationDto>> GetConversationsAsync(int userId);
    }
}