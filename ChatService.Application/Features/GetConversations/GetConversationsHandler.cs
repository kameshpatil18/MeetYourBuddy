using MediatR;
using MeetYourBuddy.ChatService.Application.Interfaces;
using MeetYourBuddy.ChatService.Domain.Entities;

namespace MeetYourBuddy.ChatService.Application.Features.GetConversations
{
    public class GetConversationsHandler : IRequestHandler<GetConversationsQuery, List<ConversationDto>>
    {
        private readonly IChatRepository _repository;

        public GetConversationsHandler(IChatRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<ConversationDto>> Handle(GetConversationsQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetConversationsAsync(request.UserId);
        }
    }
}