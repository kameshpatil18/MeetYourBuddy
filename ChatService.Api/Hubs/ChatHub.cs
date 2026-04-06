using MeetYourBuddy.ChatService.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace MeetYourBuddy.ChatService.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IChatRepository _chatRepository;

        public ChatHub(IChatRepository chatRepository)
        {
            _chatRepository = chatRepository;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId > 0)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            if (userId > 0)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(int receiverId, string message)
        {
            var senderId = GetUserId();

            if (senderId <= 0)
                throw new HubException("Unauthorized user.");

            if (receiverId <= 0)
                throw new HubException("Invalid receiverId.");

            if (string.IsNullOrWhiteSpace(message))
                throw new HubException("Message cannot be empty.");

            var messageId = await _chatRepository.SendMessageAsync(senderId, receiverId, message.Trim());

            var payload = new ChatMessageResponse
            {
                MessageId = messageId,
                SenderId = senderId,
                ReceiverId = receiverId,
                Message = message.Trim(),
                SentAt = DateTime.Now
            };

            await Clients.Group($"user_{senderId}")
                .SendAsync("ReceiveMessage", payload);

            await Clients.Group($"user_{receiverId}")
                .SendAsync("ReceiveMessage", payload);
        }

        private int GetUserId()
        {
            var userIdClaim =
                Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                Context.User?.FindFirst("sub")?.Value;

            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }
    }

    public class ChatMessageResponse
    {
        public int MessageId { get; set; }
        public int SenderId { get; set; }
        public int ReceiverId { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }
}