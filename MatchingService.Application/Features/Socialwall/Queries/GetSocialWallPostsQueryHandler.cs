using Dapper;
using MatchingService.Domain.DTOs;
using MediatR;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Shared.Common.Models;
using System.Data;

namespace MatchingService.Application.Features.Socialwall.Queries
{
    public class GetSocialWallPostsQueryHandler
        : IRequestHandler<GetSocialWallPostsQuery, ResponseModel>
    {
        private readonly IConfiguration _configuration;

        public GetSocialWallPostsQueryHandler(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<ResponseModel> Handle(
            GetSocialWallPostsQuery request,
            CancellationToken cancellationToken)
        {
            using var connection = new SqlConnection(
                _configuration.GetConnectionString("DefaultConnection"));

            using var multi = await connection.QueryMultipleAsync(
                "[SocialWall].[GetPosts]",
                new
                {
                    request.UserId,
                    request.PageNumber,
                    request.PageSize
                },
                commandType: CommandType.StoredProcedure);

            var posts = (await multi.ReadAsync<SocialWallPostDto>()).ToList();

            var pagination = await multi.ReadFirstOrDefaultAsync<SocialWallPaginationDto>();

            return new ResponseModel
            {
                Code = 1,
                Message = posts.Any() ? "Posts fetched successfully." : "No posts found.",
                Data = new
                {
                    Items = posts,
                    TotalCount = pagination?.TotalCount ?? 0,
                    PageNumber = pagination?.PageNumber ?? request.PageNumber,
                    PageSize = pagination?.PageSize ?? request.PageSize,
                    TotalPages = pagination?.TotalPages ?? 0
                }
            };
        }
    }
}
