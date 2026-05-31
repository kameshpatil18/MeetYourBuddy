using Dapper;
using MatchingService.Domain.DTOs;
using MediatR;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Shared.Common.Models;
using System.Data;
namespace MatchingService.Application.Features.Socialwall.Commands
{
    public class AddSocialWallCommentCommandHandler
        : IRequestHandler<AddSocialWallCommentCommand, ResponseModel>
    {
        private readonly IConfiguration _configuration;

        public AddSocialWallCommentCommandHandler(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<ResponseModel> Handle(
            AddSocialWallCommentCommand request,
            CancellationToken cancellationToken)
        {
            using var connection = new SqlConnection(
                _configuration.GetConnectionString("DefaultConnection"));

            var result = await connection.QueryFirstOrDefaultAsync<SpResponseDto>(
                "[SocialWall].[AddComment]",
                new
                {
                    request.PostId,
                    request.UserId,
                    request.Comment
                },
                commandType: CommandType.StoredProcedure);

            return new ResponseModel
            {
                Code = result?.Code ?? 0,
                Message = result?.Message ?? "Something went wrong.",
                Data = new
                {
                    result?.CommentId,
                    request.PostId,
                    CommentCount = result?.CommentCount ?? 0
                }
            };
        }
    }
}
