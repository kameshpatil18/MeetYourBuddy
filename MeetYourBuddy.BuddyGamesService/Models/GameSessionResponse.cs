namespace MeetYourBuddy.BuddyGamesService.Models;

public class GameSessionResponse
{
    public int Code { get; set; }

    public string Message { get; set; } = string.Empty;

    public GameSessionModel? Game { get; set; }

    public List<GameMoveModel> Moves { get; set; } = new();
}