using MediatR;
using Shared.Common.Models;

namespace ProfileService.Application.Features.Profile.Commands.CreateProfile
{
    public class CreateProfileCommand : IRequest<ResponseModel>
    {
        public int UserId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImage { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }
}