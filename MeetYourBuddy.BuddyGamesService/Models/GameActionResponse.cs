namespace MeetYourBuddy.BuddyGamesService.Models;

public class GameActionResponse
{
    public int Code { get; set; }

    public string Message { get; set; } = string.Empty;

    public int GameSessionId { get; set; }
}