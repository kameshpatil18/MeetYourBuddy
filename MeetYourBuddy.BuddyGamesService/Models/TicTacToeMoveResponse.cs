namespace MeetYourBuddy.BuddyGamesService.Models;

public class TicTacToeMoveResponse
{
    public int Code { get; set; }

    public string Message { get; set; } = string.Empty;

    public GameSessionModel? Game { get; set; }

    public int MoveNumber { get; set; }

    public int Position { get; set; }

    public string Symbol { get; set; } = string.Empty;

    public bool IsWinner { get; set; }

    public bool IsDraw { get; set; }
}