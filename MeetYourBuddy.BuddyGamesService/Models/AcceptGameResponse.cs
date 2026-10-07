namespace MeetYourBuddy.BuddyGamesService.Models;

public class AcceptGameResponse
{
    public int Code { get; set; }

    public string Message { get; set; } = string.Empty;

    public GameSessionModel? Game { get; set; }
}