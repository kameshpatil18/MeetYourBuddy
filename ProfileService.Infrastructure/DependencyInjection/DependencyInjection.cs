using Microsoft.Extensions.DependencyInjection;
using ProfileService.Application.Interfaces;
using ProfileService.Infrastructure.Repositories;

namespace ProfileService.Infrastructure.DependencyInjection
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<IProfileRepository, ProfileRepository>();
            return services;
        }
    }
}