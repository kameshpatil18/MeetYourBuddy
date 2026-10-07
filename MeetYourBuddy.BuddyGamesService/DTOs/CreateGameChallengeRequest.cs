namespace MeetYourBuddy.BuddyGamesService.DTOs;

public class CreateGameChallengeRequest
{
    public int OpponentUserId { get; set; }

    public string GameType { get; set; } = "TicTacToe";
}