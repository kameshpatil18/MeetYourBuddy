namespace MeetYourBuddy.BuddyGamesService.Models;

public class GameSessionModel
{
    public int GameSessionId { get; set; }

    public string GameType { get; set; } = string.Empty;

    public int Player1Id { get; set; }

    public int Player2Id { get; set; }

    public string? Player1Symbol { get; set; }

    public string? Player2Symbol { get; set; }

    public int? CurrentTurnUserId { get; set; }

    public string BoardState { get; set; } = "---------";

    public int? WinnerUserId { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public DateTime? StartedDate { get; set; }

    public DateTime? CompletedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }
}