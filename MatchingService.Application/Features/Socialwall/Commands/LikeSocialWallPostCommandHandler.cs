using Dapper;
using MatchingService.Domain.DTOs;
using MediatR;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Shared.Common.Models;
using System.Data;

namespace MatchingService.Application.Features.Socialwall.Commands
{
    public class LikeSocialWallPostCommandHandler
         : IRequestHandler<LikeSocialWallPostCommand, ResponseModel>
    {
        private readonly IConfiguration _configuration;

        public LikeSocialWallPostCommandHandler(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<ResponseModel> Handle(
            LikeSocialWallPostCommand request,
            CancellationToken cancellationToken)
        {
            using var connection = new SqlConnection(
                _configuration.GetConnectionString("DefaultConnection"));

            var result = await connection.QueryFirstOrDefaultAsync<SpResponseDto>(
                "[SocialWall].[LikePost]",
                new
                {
                    request.PostId,
                    request.UserId
                },
                commandType: CommandType.StoredProcedure);

            return new ResponseModel
            {
                Code = result?.Code ?? 0,
                Message = result?.Message ?? "Something went wrong.",
                Data = new
                {
                    request.PostId,
                    IsLiked = result?.IsLiked ?? false,
                    LikeCount = result?.LikeCount ?? 0
                }
            };
        }
    }
}
