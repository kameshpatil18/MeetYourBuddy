using System;
using MediatR;
using Shared.Common.Models;


namespace CategoryService.Application.Queries
{
    public class GetUserategoriesPrefrencesQuery: IRequest<ResponseModel>
    {
        public int UserId { get; set; }
    }

}
