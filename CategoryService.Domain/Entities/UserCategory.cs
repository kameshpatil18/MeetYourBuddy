namespace MeetYourBuddy.CategoryService.Domain.Entities
{
    public class UserCategory
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int CategoryId { get; set; }
    }
}