using System;
using System.Collections.Generic;
using System.Text;

namespace ChatService.Application.Interfaces
{
    public interface IOpenAiFitnessService
    {
        Task<string> GetFitnessReplyAsync(
            string category,
            string userMessage,
            CancellationToken cancellationToken = default
        );
    }
}
