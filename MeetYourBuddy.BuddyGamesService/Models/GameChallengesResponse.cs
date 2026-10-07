namespace MeetYourBuddy.BuddyGamesService.Models;

public class GameChallengesResponse
{
    public int Code { get; set; }

    public string Message { get; set; } = string.Empty;

    public List<GameChallengeModel> Challenges { get; set; } = new();
}