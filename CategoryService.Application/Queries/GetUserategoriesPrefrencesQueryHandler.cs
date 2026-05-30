using CategoryService.Application.Features.Category.Queries.GetCategories;
using CategoryService.Application.Interfaces;
using MediatR;
using Shared.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace CategoryService.Application.Queries
{
    public class GetUserategoriesPrefrencesQueryHandler : IRequestHandler<GetUserategoriesPrefrencesQuery, ResponseModel>
    {
        private readonly ICategoryRepository _categoryRepository;

        public GetUserategoriesPrefrencesQueryHandler(ICategoryRepository categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<ResponseModel> Handle(GetUserategoriesPrefrencesQuery request, CancellationToken cancellationToken)
        {
            return await _categoryRepository.GetUserategoriesPrefrences(request.UserId);
        }

    }
  
}
