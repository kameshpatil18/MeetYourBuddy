using Microsoft.AspNetCore.SignalR;
using MeetYourBuddy.BuddyGamesService.Hubs;
using MeetYourBuddy.BuddyGamesService.Models;
using MeetYourBuddy.BuddyGamesService.Repositories;

namespace MeetYourBuddy.BuddyGamesService.Services;

public class BuddyGamesService : IBuddyGamesService
{
    private readonly IBuddyGamesRepository _repository;
    private readonly IHubContext<GameHub> _hubContext;


    public BuddyGamesService(
        IBuddyGamesRepository repository,
        IHubContext<GameHub> hubContext)
    {
        _repository = repository;
        _hubContext = hubContext;
    }


    // =========================================================
    // CREATE GAME CHALLENGE
    // =========================================================

    public async Task<GameChallengeResponse>
        CreateGameChallengeAsync(
            int userId,
            int opponentUserId,
            string gameType)
    {
        if (userId <= 0)
        {
            return new GameChallengeResponse
            {
                Code = 0,
                Message = "Invalid user.",
                GameSessionId = 0
            };
        }


        if (opponentUserId <= 0)
        {
            return new GameChallengeResponse
            {
                Code = 0,
                Message = "Invalid opponent user.",
                GameSessionId = 0
            };
        }


        if (userId == opponentUserId)
        {
            return new GameChallengeResponse
            {
                Code = 0,
                Message = "You cannot challenge yourself.",
                GameSessionId = 0
            };
        }


        if (string.IsNullOrWhiteSpace(gameType))
        {
            return new GameChallengeResponse
            {
                Code = 0,
                Message = "Game type is required.",
                GameSessionId = 0
            };
        }


        if (!gameType.Equals(
                "TicTacToe",
                StringComparison.OrdinalIgnoreCase))
        {
            return new GameChallengeResponse
            {
                Code = 0,
                Message = "Invalid or unavailable game type.",
                GameSessionId = 0
            };
        }


        var response =
            await _repository.CreateGameChallengeAsync(
                userId,
                opponentUserId,
                "TicTacToe");


        //
        // Notify opponent only after DB/SP succeeded
        //

        if (response.Code == 1)
        {
            await _hubContext.Clients
                .Group($"user:{opponentUserId}")
                .SendAsync(
                    "ChallengeReceived",
                    new
                    {
                        response.GameSessionId,

                        GameType = "TicTacToe",

                        ChallengerUserId = userId,

                        OpponentUserId = opponentUserId
                    });
        }


        return response;
    }


    // =========================================================
    // GET INCOMING CHALLENGES
    // =========================================================

    public async Task<GameChallengesResponse>
        GetIncomingGameChallengesAsync(
            int userId)
    {
        if (userId <= 0)
        {
            return new GameChallengesResponse
            {
                Code = 0,
                Message = "Invalid user."
            };
        }


        var challenges =
            await _repository
                .GetIncomingGameChallengesAsync(
                    userId);


        return new GameChallengesResponse
        {
            Code = 1,

            Message =
                challenges.Count > 0
                    ? "Incoming challenges fetched successfully."
                    : "No incoming game challenges found.",

            Challenges = challenges
        };
    }


    // =========================================================
    // GET OUTGOING CHALLENGES
    // =========================================================

    public async Task<OutgoingGameChallengesResponse>
        GetOutgoingGameChallengesAsync(
            int userId)
    {
        if (userId <= 0)
        {
            return new OutgoingGameChallengesResponse
            {
                Code = 0,
                Message = "Invalid user."
            };
        }


        var challenges =
            await _repository
                .GetOutgoingGameChallengesAsync(
                    userId);


        return new OutgoingGameChallengesResponse
        {
            Code = 1,

            Message =
                challenges.Count > 0
                    ? "Outgoing challenges fetched successfully."
                    : "No outgoing game challenges found.",

            Challenges = challenges
        };
    }


    // =========================================================
    // ACCEPT GAME CHALLENGE
    // =========================================================

    public async Task<AcceptGameResponse>
        AcceptGameChallengeAsync(
            int gameSessionId,
            int userId)
    {
        if (gameSessionId <= 0)
        {
            return new AcceptGameResponse
            {
                Code = 0,
                Message = "Invalid game session."
            };
        }


        if (userId <= 0)
        {
            return new AcceptGameResponse
            {
                Code = 0,
                Message = "Invalid user."
            };
        }


        var response =
            await _repository
                .AcceptGameChallengeAsync(
                    gameSessionId,
                    userId);


        if (response.Code == 1 &&
            response.Game != null)
        {
            //
            // Notify challenger
            //

            await _hubContext.Clients
                .Group(
                    $"user:{response.Game.Player1Id}")
                .SendAsync(
                    "ChallengeAccepted",
                    response.Game);


            //
            // Notify challenged player
            //

            await _hubContext.Clients
                .Group(
                    $"user:{response.Game.Player2Id}")
                .SendAsync(
                    "ChallengeAccepted",
                    response.Game);


            //
            // Update anybody already inside the game room
            //

            await _hubContext.Clients
                .Group(
                    $"game:{gameSessionId}")
                .SendAsync(
                    "GameUpdated",
                    response.Game);
        }


        return response;
    }


    // =========================================================
    // DECLINE GAME CHALLENGE
    // =========================================================

    public async Task<GameActionResponse>
        DeclineGameChallengeAsync(
            int gameSessionId,
            int userId)
    {
        if (gameSessionId <= 0)
        {
            return new GameActionResponse
            {
                Code = 0,
                Message = "Invalid game session.",
                GameSessionId = gameSessionId
            };
        }


        //
        // Read session first because after SP succeeds,
        // we need Player1Id for SignalR notification.
        //

        var game =
            await _repository
                .GetGameSessionAsync(
                    gameSessionId,
                    userId);


        var response =
            await _repository
                .DeclineGameChallengeAsync(
                    gameSessionId,
                    userId);


        if (response.Code == 1 &&
            game.Code == 1 &&
            game.Game != null)
        {
            await _hubContext.Clients
                .Group(
                    $"user:{game.Game.Player1Id}")
                .SendAsync(
                    "ChallengeDeclined",
                    new
                    {
                        GameSessionId = gameSessionId,

                        DeclinedByUserId = userId
                    });
        }


        return response;
    }


    // =========================================================
    // CANCEL GAME CHALLENGE
    // =========================================================

    public async Task<GameActionResponse>
        CancelGameChallengeAsync(
            int gameSessionId,
            int userId)
    {
        if (gameSessionId <= 0)
        {
            return new GameActionResponse
            {
                Code = 0,
                Message = "Invalid game session.",
                GameSessionId = gameSessionId
            };
        }


        //
        // Read session first because after cancellation,
        // we need Player2Id for SignalR notification.
        //

        var game =
            await _repository
                .GetGameSessionAsync(
                    gameSessionId,
                    userId);


        var response =
            await _repository
                .CancelGameChallengeAsync(
                    gameSessionId,
                    userId);


        if (response.Code == 1 &&
            game.Code == 1 &&
            game.Game != null)
        {
            await _hubContext.Clients
                .Group(
                    $"user:{game.Game.Player2Id}")
                .SendAsync(
                    "ChallengeCancelled",
                    new
                    {
                        GameSessionId = gameSessionId,

                        CancelledByUserId = userId
                    });
        }


        return response;
    }


    // =========================================================
    // GET GAME SESSION
    // =========================================================

    public async Task<GameSessionResponse>
        GetGameSessionAsync(
            int gameSessionId,
            int userId)
    {
        if (gameSessionId <= 0)
        {
            return new GameSessionResponse
            {
                Code = 0,
                Message = "Invalid game session."
            };
        }


        if (userId <= 0)
        {
            return new GameSessionResponse
            {
                Code = 0,
                Message = "Invalid user."
            };
        }


        return await _repository
            .GetGameSessionAsync(
                gameSessionId,
                userId);
    }


    // =========================================================
    // MAKE TIC TAC TOE MOVE
    // =========================================================

    public async Task<TicTacToeMoveResponse>
        MakeTicTacToeMoveAsync(
            int gameSessionId,
            int userId,
            int position)
    {
        if (gameSessionId <= 0)
        {
            return new TicTacToeMoveResponse
            {
                Code = 0,
                Message = "Invalid game session."
            };
        }


        if (userId <= 0)
        {
            return new TicTacToeMoveResponse
            {
                Code = 0,
                Message = "Invalid user."
            };
        }


        if (position < 0 ||
            position > 8)
        {
            return new TicTacToeMoveResponse
            {
                Code = 0,
                Message = "Position must be between 0 and 8."
            };
        }


        var response =
            await _repository
                .MakeTicTacToeMoveAsync(
                    gameSessionId,
                    userId,
                    position);


        //
        // Only broadcast DB-approved moves.
        //

        if (response.Code == 1 &&
            response.Game != null)
        {
            await _hubContext.Clients
                .Group(
                    $"game:{gameSessionId}")
                .SendAsync(
                    "GameUpdated",
                    response);


            //
            // Send additional completion event
            //

            if (response.Game.Status.Equals(
                    "Completed",
                    StringComparison.OrdinalIgnoreCase))
            {
                await _hubContext.Clients
                    .Group(
                        $"game:{gameSessionId}")
                    .SendAsync(
                        "GameCompleted",
                        response);
            }
        }


        return response;
    }
}