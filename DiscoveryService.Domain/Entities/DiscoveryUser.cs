namespace DiscoveryService.Domain.Entities
{
    public class DiscoveryUser
    {
        public int UserId { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public string City { get; set; }

        public string State { get; set; }

        public string Country { get; set; }

        public string Bio { get; set; }

        public string ProfileImage { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        public double Distance { get; set; }
    }
}