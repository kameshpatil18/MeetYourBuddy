using MediatR;
using MeetYourBuddy.ChatService.Application.Interfaces;

namespace MeetYourBuddy.ChatService.Application.Features.SendMessage
{
    public class SendMessageHandler : IRequestHandler<SendMessageCommand, int>
    {
        private readonly IChatRepository _chatRepository;

        public SendMessageHandler(IChatRepository chatRepository)
        {
            _chatRepository = chatRepository;
        }

        public async Task<int> Handle(SendMessageCommand request, CancellationToken cancellationToken)
        {
            return await _chatRepository.SendMessageAsync(
                request.SenderId,
                request.ReceiverId,
                request.Message);
        }
    }
}