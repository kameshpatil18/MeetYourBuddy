using System.Data;
using Microsoft.Data.SqlClient;
using MeetYourBuddy.BuddyGamesService.Models;

namespace MeetYourBuddy.BuddyGamesService.Repositories;

public class BuddyGamesRepository : IBuddyGamesRepository
{
    private readonly string _connectionString;

    public BuddyGamesRepository(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "DefaultConnection connection string is missing.");
    }


    // =========================================================
    // CREATE CHALLENGE
    // =========================================================

    public async Task<GameChallengeResponse> CreateGameChallengeAsync(
        int userId,
        int opponentUserId,
        string gameType)
    {
        var response = new GameChallengeResponse();

        await using var connection =
            new SqlConnection(_connectionString);

        await using var command =
            new SqlCommand(
                "BuddyGames.CreateGameChallenge",
                connection);

        command.CommandType =
            CommandType.StoredProcedure;

        command.Parameters.Add(
            "@UserId",
            SqlDbType.Int).Value = userId;

        command.Parameters.Add(
            "@OpponentUserId",
            SqlDbType.Int).Value = opponentUserId;

        command.Parameters.Add(
            "@GameType",
            SqlDbType.VarChar,
            50).Value = gameType;


        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();


        if (await reader.ReadAsync())
        {
            response.Code =
                Convert.ToInt32(reader["Code"]);

            response.Message =
                Convert.ToString(reader["Message"])
                ?? string.Empty;

            response.GameSessionId =
                reader["GameSessionId"] == DBNull.Value
                    ? 0
                    : Convert.ToInt32(
                        reader["GameSessionId"]);
        }

        return response;
    }


    // =========================================================
    // INCOMING CHALLENGES
    // =========================================================

    public async Task<List<GameChallengeModel>>
        GetIncomingGameChallengesAsync(
            int userId)
    {
        var list =
            new List<GameChallengeModel>();

        await using var connection =
            new SqlConnection(_connectionString);

        await using var command =
            new SqlCommand(
                "BuddyGames.GetIncomingGameChallenges",
                connection);

        command.CommandType =
            CommandType.StoredProcedure;

        command.Parameters.Add(
            "@UserId",
            SqlDbType.Int).Value = userId;


        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();


        while (await reader.ReadAsync())
        {
            list.Add(
                new GameChallengeModel
                {
                    GameSessionId =
                        Convert.ToInt32(
                            reader["GameSessionId"]),

                    GameType =
                        Convert.ToString(
                            reader["GameType"])
                        ?? string.Empty,

                    ChallengerUserId =
                        Convert.ToInt32(
                            reader["ChallengerUserId"]),

                    ChallengedUserId =
                        Convert.ToInt32(
                            reader["ChallengedUserId"]),

                    Status =
                        Convert.ToString(
                            reader["Status"])
                        ?? string.Empty,

                    CreatedDate =
                        Convert.ToDateTime(
                            reader["CreatedDate"])
                });
        }


        return list;
    }


    // =========================================================
    // OUTGOING CHALLENGES
    // =========================================================

    public async Task<List<OutgoingGameChallengeModel>>
        GetOutgoingGameChallengesAsync(
            int userId)
    {
        var list =
            new List<OutgoingGameChallengeModel>();

        await using var connection =
            new SqlConnection(_connectionString);

        await using var command =
            new SqlCommand(
                "BuddyGames.GetOutgoingGameChallenges",
                connection);

        command.CommandType =
            CommandType.StoredProcedure;

        command.Parameters.Add(
            "@UserId",
            SqlDbType.Int).Value = userId;


        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();


        while (await reader.ReadAsync())
        {
            list.Add(
                new OutgoingGameChallengeModel
                {
                    GameSessionId =
                        Convert.ToInt32(
                            reader["GameSessionId"]),

                    GameType =
                        Convert.ToString(
                            reader["GameType"])
                        ?? string.Empty,

                    ChallengerUserId =
                        Convert.ToInt32(
                            reader["ChallengerUserId"]),

                    OpponentUserId =
                        Convert.ToInt32(
                            reader["OpponentUserId"]),

                    Status =
                        Convert.ToString(
                            reader["Status"])
                        ?? string.Empty,

                    CreatedDate =
                        Convert.ToDateTime(
                            reader["CreatedDate"])
                });
        }


        return list;
    }


    // =========================================================
    // ACCEPT CHALLENGE
    // =========================================================

    public async Task<AcceptGameResponse>
        AcceptGameChallengeAsync(
            int gameSessionId,
            int userId)
    {
        var response =
            new AcceptGameResponse();


        await using var connection =
            new SqlConnection(_connectionString);

        await using var command =
            new SqlCommand(
                "BuddyGames.AcceptGameChallenge",
                connection);

        command.CommandType =
            CommandType.StoredProcedure;

        command.Parameters.Add(
            "@GameSessionId",
            SqlDbType.Int).Value = gameSessionId;

        command.Parameters.Add(
            "@UserId",
            SqlDbType.Int).Value = userId;


        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();


        if (!await reader.ReadAsync())
            return response;


        response.Code =
            Convert.ToInt32(reader["Code"]);

        response.Message =
            Convert.ToString(reader["Message"])
            ?? string.Empty;


        if (response.Code == 1)
        {
            response.Game =
                new GameSessionModel
                {
                    GameSessionId =
                        Convert.ToInt32(
                            reader["GameSessionId"]),

                    GameType =
                        Convert.ToString(
                            reader["GameType"])
                        ?? string.Empty,

                    Player1Id =
                        Convert.ToInt32(
                            reader["Player1Id"]),

                    Player2Id =
                        Convert.ToInt32(
                            reader["Player2Id"]),

                    Player1Symbol =
                        GetNullableString(
                            reader["Player1Symbol"]),

                    Player2Symbol =
                        GetNullableString(
                            reader["Player2Symbol"]),

                    CurrentTurnUserId =
                        GetNullableInt(
                            reader["CurrentTurnUserId"]),

                    BoardState =
                        Convert.ToString(
                            reader["BoardState"])
                        ?? "---------",

                    Status =
                        Convert.ToString(
                            reader["Status"])
                        ?? string.Empty,

                    StartedDate =
                        GetNullableDateTime(
                            reader["StartedDate"])
                };
        }


        return response;
    }


    // =========================================================
    // DECLINE CHALLENGE
    // =========================================================

    public async Task<GameActionResponse>
        DeclineGameChallengeAsync(
            int gameSessionId,
            int userId)
    {
        return await ExecuteSimpleActionAsync(
            "BuddyGames.DeclineGameChallenge",
            gameSessionId,
            userId);
    }


    // =========================================================
    // CANCEL CHALLENGE
    // =========================================================

    public async Task<GameActionResponse>
        CancelGameChallengeAsync(
            int gameSessionId,
            int userId)
    {
        return await ExecuteSimpleActionAsync(
            "BuddyGames.CancelGameChallenge",
            gameSessionId,
            userId);
    }


    // =========================================================
    // GET GAME SESSION
    // =========================================================

    public async Task<GameSessionResponse>
        GetGameSessionAsync(
            int gameSessionId,
            int userId)
    {
        var response =
            new GameSessionResponse();


        await using var connection =
            new SqlConnection(_connectionString);

        await using var command =
            new SqlCommand(
                "BuddyGames.GetGameSession",
                connection);

        command.CommandType =
            CommandType.StoredProcedure;

        command.Parameters.Add(
            "@GameSessionId",
            SqlDbType.Int).Value = gameSessionId;

        command.Parameters.Add(
            "@UserId",
            SqlDbType.Int).Value = userId;


        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();


        if (!await reader.ReadAsync())
            return response;


        response.Code =
            Convert.ToInt32(
                reader["Code"]);

        response.Message =
            Convert.ToString(
                reader["Message"])
            ?? string.Empty;


        if (response.Code != 1)
            return response;


        response.Game =
            new GameSessionModel
            {
                GameSessionId =
                    Convert.ToInt32(
                        reader["GameSessionId"]),

                GameType =
                    Convert.ToString(
                        reader["GameType"])
                    ?? string.Empty,

                Player1Id =
                    Convert.ToInt32(
                        reader["Player1Id"]),

                Player2Id =
                    Convert.ToInt32(
                        reader["Player2Id"]),

                Player1Symbol =
                    GetNullableString(
                        reader["Player1Symbol"]),

                Player2Symbol =
                    GetNullableString(
                        reader["Player2Symbol"]),

                CurrentTurnUserId =
                    GetNullableInt(
                        reader["CurrentTurnUserId"]),

                BoardState =
                    Convert.ToString(
                        reader["BoardState"])
                    ?? "---------",

                WinnerUserId =
                    GetNullableInt(
                        reader["WinnerUserId"]),

                Status =
                    Convert.ToString(
                        reader["Status"])
                    ?? string.Empty,

                CreatedDate =
                    Convert.ToDateTime(
                        reader["CreatedDate"]),

                StartedDate =
                    GetNullableDateTime(
                        reader["StartedDate"]),

                CompletedDate =
                    GetNullableDateTime(
                        reader["CompletedDate"]),

                UpdatedDate =
                    GetNullableDateTime(
                        reader["UpdatedDate"])
            };


        //
        // Second result set = moves
        //

        if (await reader.NextResultAsync())
        {
            while (await reader.ReadAsync())
            {
                response.Moves.Add(
                    new GameMoveModel
                    {
                        MoveId =
                            Convert.ToInt32(
                                reader["MoveId"]),

                        GameSessionId =
                            Convert.ToInt32(
                                reader["GameSessionId"]),

                        UserId =
                            Convert.ToInt32(
                                reader["UserId"]),

                        Position =
                            Convert.ToInt32(
                                reader["Position"]),

                        Symbol =
                            Convert.ToString(
                                reader["Symbol"])
                            ?? string.Empty,

                        MoveNumber =
                            Convert.ToInt32(
                                reader["MoveNumber"]),

                        CreatedDate =
                            Convert.ToDateTime(
                                reader["CreatedDate"])
                    });
            }
        }


        return response;
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
        var response =
            new TicTacToeMoveResponse();


        await using var connection =
            new SqlConnection(_connectionString);

        await using var command =
            new SqlCommand(
                "BuddyGames.MakeTicTacToeMove",
                connection);

        command.CommandType =
            CommandType.StoredProcedure;


        command.Parameters.Add(
            "@GameSessionId",
            SqlDbType.Int).Value =
            gameSessionId;

        command.Parameters.Add(
            "@UserId",
            SqlDbType.Int).Value =
            userId;

        command.Parameters.Add(
            "@Position",
            SqlDbType.Int).Value =
            position;


        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();


        if (!await reader.ReadAsync())
            return response;


        response.Code =
            Convert.ToInt32(
                reader["Code"]);

        response.Message =
            Convert.ToString(
                reader["Message"])
            ?? string.Empty;


        if (response.Code != 1)
            return response;


        response.MoveNumber =
            Convert.ToInt32(
                reader["MoveNumber"]);

        response.Position =
            Convert.ToInt32(
                reader["Position"]);

        response.Symbol =
            Convert.ToString(
                reader["Symbol"])
            ?? string.Empty;

        response.IsWinner =
            Convert.ToBoolean(
                reader["IsWinner"]);

        response.IsDraw =
            Convert.ToBoolean(
                reader["IsDraw"]);


        response.Game =
            new GameSessionModel
            {
                GameSessionId =
                    Convert.ToInt32(
                        reader["GameSessionId"]),

                GameType =
                    Convert.ToString(
                        reader["GameType"])
                    ?? string.Empty,

                Player1Id =
                    Convert.ToInt32(
                        reader["Player1Id"]),

                Player2Id =
                    Convert.ToInt32(
                        reader["Player2Id"]),

                Player1Symbol =
                    GetNullableString(
                        reader["Player1Symbol"]),

                Player2Symbol =
                    GetNullableString(
                        reader["Player2Symbol"]),

                BoardState =
                    Convert.ToString(
                        reader["BoardState"])
                    ?? "---------",

                CurrentTurnUserId =
                    GetNullableInt(
                        reader["CurrentTurnUserId"]),

                WinnerUserId =
                    GetNullableInt(
                        reader["WinnerUserId"]),

                Status =
                    Convert.ToString(
                        reader["Status"])
                    ?? string.Empty,

                StartedDate =
                    GetNullableDateTime(
                        reader["StartedDate"]),

                CompletedDate =
                    GetNullableDateTime(
                        reader["CompletedDate"]),

                UpdatedDate =
                    GetNullableDateTime(
                        reader["UpdatedDate"])
            };


        return response;
    }


    // =========================================================
    // COMMON SIMPLE ACTION
    // =========================================================

    private async Task<GameActionResponse>
        ExecuteSimpleActionAsync(
            string storedProcedure,
            int gameSessionId,
            int userId)
    {
        var response =
            new GameActionResponse();


        await using var connection =
            new SqlConnection(_connectionString);

        await using var command =
            new SqlCommand(
                storedProcedure,
                connection);

        command.CommandType =
            CommandType.StoredProcedure;


        command.Parameters.Add(
            "@GameSessionId",
            SqlDbType.Int).Value =
            gameSessionId;

        command.Parameters.Add(
            "@UserId",
            SqlDbType.Int).Value =
            userId;


        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();


        if (await reader.ReadAsync())
        {
            response.Code =
                Convert.ToInt32(
                    reader["Code"]);

            response.Message =
                Convert.ToString(
                    reader["Message"])
                ?? string.Empty;

            response.GameSessionId =
                reader["GameSessionId"] == DBNull.Value
                    ? 0
                    : Convert.ToInt32(
                        reader["GameSessionId"]);
        }


        return response;
    }


    // =========================================================
    // HELPERS
    // =========================================================

    private static int? GetNullableInt(
        object value)
    {
        if (value == DBNull.Value)
            return null;

        return Convert.ToInt32(value);
    }


    private static DateTime? GetNullableDateTime(
        object value)
    {
        if (value == DBNull.Value)
            return null;

        return Convert.ToDateTime(value);
    }


    private static string? GetNullableString(
        object value)
    {
        if (value == DBNull.Value)
            return null;

        return Convert.ToString(value);
    }
}