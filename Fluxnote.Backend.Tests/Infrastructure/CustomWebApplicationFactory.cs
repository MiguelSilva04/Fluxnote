using System.Data.Common;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Services.Email;
using Fluxnote.Backend.Tests.Fakes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;

namespace Fluxnote.Backend.Tests.Infrastructure;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private DbConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Garantir que a configuração de testes contenha valores para Jwt:Key etc.
        builder.ConfigureAppConfiguration((context, config) =>
        {
            var dict = new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "integration-tests-secret-key",
                ["Jwt:Issuer"] = "fluxnote-tests",
                ["Jwt:Audience"] = "fluxnote-tests"
            };
            config.AddInMemoryCollection(dict);
        });

        builder.ConfigureServices(services =>
        {
            // remover o DbContext registado pela app (SQL Server) para se por o SQLite
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<FluxnoteServerContext>)
            );
            if (dbContextDescriptor != null)
                services.Remove(dbContextDescriptor);

            // criar uma conexão SQLite in-memory e mantê-la aberta durante os testes
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            // registar o DbContext com SQLite
            services.AddDbContext<FluxnoteServerContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            // substituir o IEmailSender por um fake (captura links)
            var emailSenderDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IEmailSender));
            if (emailSenderDescriptor != null)
                services.Remove(emailSenderDescriptor);

            services.AddSingleton<TestEmailSender>();
            services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<TestEmailSender>());

            // criar a BD/tabelas (aplica migrations)
            var sp2 = services.BuildServiceProvider();
            using var scope = sp2.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

            // IMPORTANTE: em SQLite in-memory temos de garantir que a BD é criada
            db.Database.EnsureCreated();
            // alternativamente, se preferimos usar migrations:
            // db.Database.Migrate();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection?.Dispose();
        }
    }
}
