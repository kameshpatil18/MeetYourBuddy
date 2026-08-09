using ChatService.Application.Interfaces;
using MeetYourBuddy.ChatService.API.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace MeetYourBuddy.ChatService.Api.Services
{
    public class OpenAiFitnessService : IOpenAiFitnessService
    {
        private readonly HttpClient _httpClient;
        private readonly OpenAiOptions _openAiOptions;
        private readonly ILogger<OpenAiFitnessService> _logger;

        public OpenAiFitnessService(
            HttpClient httpClient,
            IOptions<OpenAiOptions> openAiOptions,
            ILogger<OpenAiFitnessService> logger
        )
        {
            _httpClient = httpClient;
            _openAiOptions = openAiOptions.Value;
            _logger = logger;
        }

        public async Task<string> GetFitnessReplyAsync(
            string category,
            string userMessage,
            CancellationToken cancellationToken = default
        )
        {
            if (string.IsNullOrWhiteSpace(_openAiOptions.ApiKey))
            {
                throw new InvalidOperationException(
                    "OpenAI API key is missing. Configure OpenAI:ApiKey."
                );
            }

            var categoryInstruction = GetCategoryInstruction(category);

            var systemInstruction = $"""
You are FitBot, a friendly fitness assistant inside the MeetYourBuddy app.

Your role:
- Help users with general fitness, exercise, nutrition, recovery, and motivation.
- Give practical, safe, beginner-friendly advice.
- Keep answers concise and easy to understand.
- Use bullet points when useful.
- Encourage users, but do not be overly dramatic.

Current selected category:
{categoryInstruction}

Safety rules:
- Do not diagnose diseases, injuries, or medical conditions.
- Do not provide emergency medical advice.
- Do not recommend dangerous supplement doses, steroids, illegal drugs, starvation diets, or extreme workouts.
- For pain, injuries, pregnancy, medications, chronic diseases, eating disorders, or serious health concerns, advise consulting a qualified doctor, physiotherapist, or registered dietitian.
- State that general fitness advice is not a replacement for professional medical advice when needed.
""";

            var requestBody = new
            {
                model = _openAiOptions.Model,
                instructions = systemInstruction,
                input = userMessage,
                temperature = 0.7,
                max_output_tokens = 500
            };

            var json = JsonSerializer.Serialize(requestBody);

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "https://api.openai.com/v1/responses"
            );

            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                _openAiOptions.ApiKey
            );

            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json")
            );

            request.Content = new StringContent(
                json,
                Encoding.UTF8,
                "application/json"
            );

            using var response = await _httpClient.SendAsync(
                request,
                cancellationToken
            );

            var responseContent = await response.Content.ReadAsStringAsync(
                cancellationToken
            );

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "OpenAI API failed. Status: {StatusCode}, Response: {Response}",
                    response.StatusCode,
                    responseContent
                );

                throw new InvalidOperationException(
                    "FitBot could not generate a response right now."
                );
            }

            using var document = JsonDocument.Parse(responseContent);

            var answer = ExtractOutputText(document.RootElement);

            if (string.IsNullOrWhiteSpace(answer))
            {
                throw new InvalidOperationException(
                    "FitBot returned an empty response."
                );
            }

            return answer.Trim();
        }

        private static string GetCategoryInstruction(string? category)
        {
            return category?.Trim().ToLowerInvariant() switch
            {
                "workout" or "beginner-workout" =>
                    "Focus on safe workout plans, exercise selection, sets, reps, warm-ups, and progressive overload.",

                "diet" or "nutrition" =>
                    "Focus on balanced nutrition, protein, hydration, meal planning, and practical food choices.",

                "fat-loss" or "weight-loss" =>
                    "Focus on sustainable fat loss through moderate calorie deficit, protein, steps, strength training, and sleep.",

                "muscle-gain" or "bulking" =>
                    "Focus on progressive overload, enough protein, calorie surplus when appropriate, recovery, and consistency.",

                "recovery" =>
                    "Focus on rest days, sleep, mobility, soreness management, hydration, and realistic training volume.",

                "supplements" =>
                    "Give cautious evidence-based supplement guidance. Avoid medical claims and never recommend unsafe dosages.",

                "exercise-form" =>
                    "Explain exercise technique with simple step-by-step cues, common mistakes, and safety notes.",

                "motivation" =>
                    "Give supportive, practical advice for building habits, staying consistent, and setting achievable goals.",

                _ =>
                    "Give general safe fitness guidance tailored to the user question."
            };
        }

        private static string ExtractOutputText(JsonElement root)
        {
            if (
                root.TryGetProperty("output_text", out var outputText) &&
                outputText.ValueKind == JsonValueKind.String
            )
            {
                return outputText.GetString() ?? string.Empty;
            }

            if (
                !root.TryGetProperty("output", out var output) ||
                output.ValueKind != JsonValueKind.Array
            )
            {
                return string.Empty;
            }

            var textBuilder = new StringBuilder();

            foreach (var outputItem in output.EnumerateArray())
            {
                if (
                    !outputItem.TryGetProperty("content", out var content) ||
                    content.ValueKind != JsonValueKind.Array
                )
                {
                    continue;
                }

                foreach (var contentItem in content.EnumerateArray())
                {
                    if (
                        contentItem.TryGetProperty("type", out var type) &&
                        type.GetString() == "output_text" &&
                        contentItem.TryGetProperty("text", out var text)
                    )
                    {
                        textBuilder.Append(text.GetString());
                    }
                }
            }

            return textBuilder.ToString();
        }
    }
}
