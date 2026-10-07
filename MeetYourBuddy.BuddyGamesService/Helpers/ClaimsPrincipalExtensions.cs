using System.Security.Claims;

namespace MeetYourBuddy.BuddyGamesService.Helpers;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(
        this ClaimsPrincipal user)
    {
        if (user == null)
        {
            return 0;
        }


        //
        // Standard NameIdentifier
        //

        var userIdClaim =
            user.FindFirst(
                ClaimTypes.NameIdentifier);


        //
        // Try common custom claim names
        //

        userIdClaim ??=
            user.FindFirst("UserId");

        userIdClaim ??=
            user.FindFirst("userId");

        userIdClaim ??=
            user.FindFirst("userid");

        userIdClaim ??=
            user.FindFirst("sub");


        if (userIdClaim == null)
        {
            return 0;
        }


        return int.TryParse(
            userIdClaim.Value,
            out var userId)
            ? userId
            : 0;
    }
}