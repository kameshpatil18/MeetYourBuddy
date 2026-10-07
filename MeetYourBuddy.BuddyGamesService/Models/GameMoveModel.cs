namespace MeetYourBuddy.BuddyGamesService.Models;

public class GameMoveModel
{
    public int MoveId { get; set; }

    public int GameSessionId { get; set; }

    public int UserId { get; set; }

    public int Position { get; set; }

    public string Symbol { get; set; } = string.Empty;

    public int MoveNumber { get; set; }

    public DateTime CreatedDate { get; set; }
}