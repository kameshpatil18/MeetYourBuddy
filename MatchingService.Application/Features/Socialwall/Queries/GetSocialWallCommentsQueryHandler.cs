using Dapper;
using MatchingService.Domain.DTOs;
using MediatR;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Shared.Common.Models;
using System.Data;

namespace MatchingService.Application.Features.Socialwall.Queries
{
    public class GetSocialWallCommentsQueryHandler
      : IRequestHandler<GetSocialWallCommentsQuery, ResponseModel>
    {
        private readonly IConfiguration _configuration;

        public GetSocialWallCommentsQueryHandler(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<ResponseModel> Handle(
            GetSocialWallCommentsQuery request,
            CancellationToken cancellationToken)
        {
            using var connection = new SqlConnection(
                _configuration.GetConnectionString("DefaultConnection"));

            var comments = await connection.QueryAsync<SocialWallCommentDto>(
                "[SocialWall].[GetComments]",
                new
                {
                    request.PostId,
                    request.UserId
                },
                commandType: CommandType.StoredProcedure);

            var commentList = comments.ToList();

            return new ResponseModel
            {
                Code = 1,
                Message = commentList.Any() ? "Comments fetched successfully." : "No comments found.",
                Data = commentList
            };
        }
    }
}
