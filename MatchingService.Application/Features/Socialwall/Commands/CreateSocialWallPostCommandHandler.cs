using Dapper;
using MatchingService.Application.Features.SocialWall.Commands;
using MatchingService.Domain.DTOs;
using MediatR;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Shared.Common.Models;
using System.Data;


namespace MatchingService.Application.Features.Socialwall.Commands
{
    public class CreateSocialWallPostCommandHandler
          : IRequestHandler<CreateSocialWallPostCommand, ResponseModel>
    {
        private readonly IConfiguration _configuration;

        public CreateSocialWallPostCommandHandler(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<ResponseModel> Handle(
            CreateSocialWallPostCommand request,
            CancellationToken cancellationToken)
        {
            using var connection = new SqlConnection(
                _configuration.GetConnectionString("DefaultConnection"));

            var result = await connection.QueryFirstOrDefaultAsync<SpResponseDto>(
                "[SocialWall].[CreatePost]",
                new
                {
                    request.UserId,
                    request.Content,
                    request.ImageUrl
                },
                commandType: CommandType.StoredProcedure);

            return new ResponseModel
            {
                Code = result?.Code ?? 0,
                Message = result?.Message ?? "Something went wrong.",
                Data = new
                {
                    result?.PostId
                }
            };
        }
    }
}
