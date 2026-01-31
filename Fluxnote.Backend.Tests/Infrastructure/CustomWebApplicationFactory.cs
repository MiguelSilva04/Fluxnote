using System;
using System.Data.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Tests.Fakes;
using System.Collections.Generic;
using Fluxnote.Backend.Services.Email;

namespace Fluxnote.Backend.Tests.Infrastructure;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private DbConnection? _connection;

    // Static constructor runs when the type is first used — sets env vars before host creation
    static CustomWebApplicationFactory()
    {
        // Ensure Program.Main can find the Jwt key (double-underscore name for nested config)
        Environment.SetEnvironmentVariable("Jwt__Key", "test-secret-key-please-change-for-ci");

        // Optionally set other env vars your Program expects
        Environment.SetEnvironmentVariable("Jwt__Issuer", "fluxnote-tests");
        Environment.SetEnvironmentVariable("Jwt__Audience", "fluxnote-tests");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Ensure test environment
        builder.UseEnvironment("Test");

        // Inject minimal required configuration values for tests
        builder.ConfigureAppConfiguration((context, configBuilder) =>
        {
            var testSettings = new Dictionary<string, string?>
            {
                // JWT configuration
                { "Jwt:Key", "test-secret-key-please-change-for-ci" },
                { "Jwt:Issuer", "fluxnote-tests" },
                { "Jwt:Audience", "fluxnote-tests" },
                { "Jwt:AccessTokenMinutes", "15" },
                // Auth configuration
                { "Auth:RefreshIdleDays", "7" },
                { "Auth:RefreshAbsoluteDays", "7" },
                { "Auth:RefreshAbsoluteDaysRememberMe", "30" },
                { "Auth:RefreshCookieName", "fluxnote_rt" },
                // Disable rate limiting for tests
                { "IpRateLimiting:EnableEndpointRateLimiting", "false" },
                // Frontend
                { "Frontend:BaseUrl", "http://localhost:4200" }
            };

            configBuilder.AddInMemoryCollection(testSettings);
        });

        builder.ConfigureServices(services =>
        {
            // Replace real email sender with test fake
            services.AddSingleton<TestEmailSender>();
            services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<TestEmailSender>());

            // Remove existing DbContext registration(s)
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<FluxnoteServerContext>));
            if (descriptor != null) services.Remove(descriptor);

            var contextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(FluxnoteServerContext));
            if (contextDescriptor != null) services.Remove(contextDescriptor);

            // Create and open a shared in-memory SQLite connection for EF Core
            _connection ??= new SqliteConnection("DataSource=:memory:");
            if (_connection is SqliteConnection sqlite)
            {
                sqlite.Open();
            }

            // Register the test DbContext using the open connection
            services.AddDbContext<FluxnoteServerContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            // Build the provider and ensure DB is created
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            db.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            if (_connection != null)
            {
                try
                {
                    _connection.Close();
                    _connection.Dispose();
                }
                finally
                {
                    _connection = null;
                }
            }
        }
    }
}
