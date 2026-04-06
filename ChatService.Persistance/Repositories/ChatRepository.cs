using Dapper;
using MeetYourBuddy.ChatService.Application.Interfaces;
using MeetYourBuddy.ChatService.Domain.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;

namespace MeetYourBuddy.ChatService.Persistence.Repositories
{
    public class ChatRepository : IChatRepository
    {
        private readonly string _connectionString;

        public ChatRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("DefaultConnection is missing in configuration.");
        }

        public async Task<int> SendMessageAsync(int senderId, int receiverId, string message)
        {
            using var connection = new SqlConnection(_connectionString);

            var parameters = new DynamicParameters();
            parameters.Add("@SenderId", senderId);
            parameters.Add("@ReceiverId", receiverId);
            parameters.Add("@Message", message);

            var result = await connection.ExecuteScalarAsync<int>(
                "Chat.SendMessage",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result;
        }

        public async Task<List<Message>> GetChatHistoryAsync(int user1Id, int user2Id)
        {
            using var connection = new SqlConnection(_connectionString);

            var parameters = new DynamicParameters();
            parameters.Add("@User1Id", user1Id);
            parameters.Add("@User2Id", user2Id);

            var result = await connection.QueryAsync<Message>(
                "Chat.GetChatHistory",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<List<ConversationDto>> GetConversationsAsync(int userId)
        {
            using var connection = new SqlConnection(_connectionString);

            var parameters = new DynamicParameters();
            parameters.Add("@UserId", userId);

            var result = await connection.QueryAsync<ConversationDto>(
                "Chat.GetConversations",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }
    }
}