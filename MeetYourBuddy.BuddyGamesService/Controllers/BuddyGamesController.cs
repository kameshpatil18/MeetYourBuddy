using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MeetYourBuddy.BuddyGamesService.DTOs;
using MeetYourBuddy.BuddyGamesService.Helpers;
using MeetYourBuddy.BuddyGamesService.Services;

namespace MeetYourBuddy.BuddyGamesService.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BuddyGamesController : ControllerBase
{
    private readonly IBuddyGamesService _service;


    public BuddyGamesController(
        IBuddyGamesService service)
    {
        _service = service;
    }


    // =========================================================
    // CREATE CHALLENGE
    // =========================================================

    [HttpPost("challenge")]
    public async Task<IActionResult>
        CreateGameChallenge(
            [FromBody]
            CreateGameChallengeRequest request)
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        var response =
            await _service
                .CreateGameChallengeAsync(
                    userId,
                    request.OpponentUserId,
                    request.GameType);


        return Ok(response);
    }


    // =========================================================
    // INCOMING CHALLENGES
    // =========================================================

    [HttpGet("challenges/incoming")]
    public async Task<IActionResult>
        GetIncomingChallenges()
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        return Ok(
            await _service
                .GetIncomingGameChallengesAsync(
                    userId));
    }


    // =========================================================
    // OUTGOING CHALLENGES
    // =========================================================

    [HttpGet("challenges/outgoing")]
    public async Task<IActionResult>
        GetOutgoingChallenges()
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        return Ok(
            await _service
                .GetOutgoingGameChallengesAsync(
                    userId));
    }


    // =========================================================
    // ACCEPT
    // =========================================================

    [HttpPost(
        "challenges/{gameSessionId:int}/accept")]
    public async Task<IActionResult>
        AcceptChallenge(
            int gameSessionId)
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        return Ok(
            await _service
                .AcceptGameChallengeAsync(
                    gameSessionId,
                    userId));
    }


    // =========================================================
    // DECLINE
    // =========================================================

    [HttpPost(
        "challenges/{gameSessionId:int}/decline")]
    public async Task<IActionResult>
        DeclineChallenge(
            int gameSessionId)
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        return Ok(
            await _service
                .DeclineGameChallengeAsync(
                    gameSessionId,
                    userId));
    }


    // =========================================================
    // CANCEL
    // =========================================================

    [HttpPost(
        "challenges/{gameSessionId:int}/cancel")]
    public async Task<IActionResult>
        CancelChallenge(
            int gameSessionId)
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        return Ok(
            await _service
                .CancelGameChallengeAsync(
                    gameSessionId,
                    userId));
    }


    // =========================================================
    // GET GAME
    // =========================================================

    [HttpGet(
        "games/{gameSessionId:int}")]
    public async Task<IActionResult>
        GetGame(
            int gameSessionId)
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        return Ok(
            await _service
                .GetGameSessionAsync(
                    gameSessionId,
                    userId));
    }


    // =========================================================
    // MAKE MOVE
    // =========================================================

    [HttpPost(
        "games/{gameSessionId:int}/move")]
    public async Task<IActionResult>
        MakeMove(
            int gameSessionId,
            [FromBody]
            MakeTicTacToeMoveRequest request)
    {
        var userId =
            User.GetUserId();


        if (userId <= 0)
            return Unauthorized();


        return Ok(
            await _service
                .MakeTicTacToeMoveAsync(
                    gameSessionId,
                    userId,
                    request.Position));
    }
}