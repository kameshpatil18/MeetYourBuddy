namespace MeetYourBuddy.BuddyGamesService.Models;

public class GameChallengeModel
{
    public int GameSessionId { get; set; }

    public string GameType { get; set; } = string.Empty;

    public int ChallengerUserId { get; set; }

    public int ChallengedUserId { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
}