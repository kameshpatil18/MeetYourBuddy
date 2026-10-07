namespace MeetYourBuddy.BuddyGamesService.Models;

public class OutgoingGameChallengesResponse
{
    public int Code { get; set; }

    public string Message { get; set; } = string.Empty;

    public List<OutgoingGameChallengeModel> Challenges { get; set; } = new();
}