using MediatR;
using MeetYourBuddy.ChatService.Application.Interfaces;
using MeetYourBuddy.ChatService.Domain.Entities;

namespace MeetYourBuddy.ChatService.Application.Features.GetChatHistory
{
    public class GetChatHistoryHandler : IRequestHandler<GetChatHistoryQuery, List<Message>>
    {
        private readonly IChatRepository _chatRepository;

        public GetChatHistoryHandler(IChatRepository chatRepository)
        {
            _chatRepository = chatRepository;
        }

        public async Task<List<Message>> Handle(GetChatHistoryQuery request, CancellationToken cancellationToken)
        {
            return await _chatRepository.GetChatHistoryAsync(request.User1Id, request.User2Id);
        }
    }
}