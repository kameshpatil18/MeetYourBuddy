using MeetYourBuddy.BuddyGamesService.Models;

namespace MeetYourBuddy.BuddyGamesService.Repositories;

public interface IBuddyGamesRepository
{
    Task<GameChallengeResponse> CreateGameChallengeAsync(
        int userId,
        int opponentUserId,
        string gameType);


    Task<List<GameChallengeModel>> GetIncomingGameChallengesAsync(
        int userId);


    Task<List<OutgoingGameChallengeModel>> GetOutgoingGameChallengesAsync(
        int userId);


    Task<AcceptGameResponse> AcceptGameChallengeAsync(
        int gameSessionId,
        int userId);


    Task<GameActionResponse> DeclineGameChallengeAsync(
        int gameSessionId,
        int userId);


    Task<GameActionResponse> CancelGameChallengeAsync(
        int gameSessionId,
        int userId);


    Task<GameSessionResponse> GetGameSessionAsync(
        int gameSessionId,
        int userId);


    Task<TicTacToeMoveResponse> MakeTicTacToeMoveAsync(
        int gameSessionId,
        int userId,
        int position);
}