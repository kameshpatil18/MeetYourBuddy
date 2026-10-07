using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MeetYourBuddy.BuddyGamesService.Helpers;
using MeetYourBuddy.BuddyGamesService.Repositories;

namespace MeetYourBuddy.BuddyGamesService.Hubs;

[Authorize]
public class GameHub : Hub
{
    private readonly IBuddyGamesRepository _repository;

    public GameHub(
        IBuddyGamesRepository repository)
    {
        _repository = repository;
    }


    // =========================================================
    // ON CONNECT
    // =========================================================

    public override async Task OnConnectedAsync()
    {
        var userId =
            Context.User.GetUserId();


        if (userId > 0)
        {
            //
            // Every logged-in user automatically joins
            // their own private notification group.
            //

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                $"user:{userId}");
        }


        await base.OnConnectedAsync();
    }


    // =========================================================
    // JOIN GAME ROOM
    // =========================================================

    public async Task JoinGame(
        int gameSessionId)
    {
        var userId =
            Context.User.GetUserId();


        if (userId <= 0)
        {
            throw new HubException(
                "Unable to identify logged-in user.");
        }


        //
        // Important:
        // Validate through DB that this user actually
        // belongs to the requested game.
        //

        var game =
            await _repository.GetGameSessionAsync(
                gameSessionId,
                userId);


        if (game.Code != 1 ||
            game.Game == null)
        {
            throw new HubException(
                "You are not allowed to join this game.");
        }


        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            $"game:{gameSessionId}");
    }


    // =========================================================
    // LEAVE GAME ROOM
    // =========================================================

    public async Task LeaveGame(
        int gameSessionId)
    {
        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            $"game:{gameSessionId}");
    }
}