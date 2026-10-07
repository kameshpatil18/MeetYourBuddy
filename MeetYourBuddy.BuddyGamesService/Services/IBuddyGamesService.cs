using MeetYourBuddy.BuddyGamesService.Models;

namespace MeetYourBuddy.BuddyGamesService.Services;

public interface IBuddyGamesService
{
    Task<GameChallengeResponse> CreateGameChallengeAsync(
        int userId,
        int opponentUserId,
        string gameType);


    Task<GameChallengesResponse>
        GetIncomingGameChallengesAsync(
            int userId);


    Task<OutgoingGameChallengesResponse>
        GetOutgoingGameChallengesAsync(
            int userId);


    Task<AcceptGameResponse>
        AcceptGameChallengeAsync(
            int gameSessionId,
            int userId);


    Task<GameActionResponse>
        DeclineGameChallengeAsync(
            int gameSessionId,
            int userId);


    Task<GameActionResponse>
        CancelGameChallengeAsync(
            int gameSessionId,
            int userId);


    Task<GameSessionResponse>
        GetGameSessionAsync(
            int gameSessionId,
            int userId);


    Task<TicTacToeMoveResponse>
        MakeTicTacToeMoveAsync(
            int gameSessionId,
            int userId,
            int position);
}