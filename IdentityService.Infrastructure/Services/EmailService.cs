using IdentityService.Application.Interfaces;
using Microsoft.Extensions.Options;
using Shared.Common.Models;
using System.Net;
using System.Net.Mail;

namespace IdentityService.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;

        public EmailService(IOptions<EmailSettings> emailSettings)
        {
            _emailSettings = emailSettings.Value;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                using var client = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.Port)
                {
                    EnableSsl = true,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(
                        _emailSettings.Username,
                        _emailSettings.Password)
                };

                var mail = new MailMessage
                {
                    From = new MailAddress("kameshpatil18@gmail.com", "MeetYourBuddy"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                mail.To.Add(toEmail);

                await client.SendMailAsync(mail);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Email Error: " + ex.Message);
                throw;
            }
        }
    }
}