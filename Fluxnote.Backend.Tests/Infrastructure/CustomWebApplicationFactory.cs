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
using Fluxnote.Backend.Services.AI;
using Fluxnote.Backend.Services.Email;

namespace Fluxnote.Backend.Tests.Infrastructure;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private DbConnection? _connection;

    // Construtor estático - executa quando o tipo é usado pela primeira vez, define variáveis de ambiente antes da criação do host
    static CustomWebApplicationFactory()
    {
        // Garantir que o Program.Main encontra a chave JWT (nome com double-underscore para config aninhada)
        Environment.SetEnvironmentVariable("Jwt__Key", "test-secret-key-please-change-for-ci");

        // Definir outras variáveis de ambiente esperadas pelo Program
        Environment.SetEnvironmentVariable("Jwt__Issuer", "fluxnote-tests");
        Environment.SetEnvironmentVariable("Jwt__Audience", "fluxnote-tests");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Garantir ambiente de teste
        builder.UseEnvironment("Test");

        // Injetar valores de configuração mínimos necessários para testes
        builder.ConfigureAppConfiguration((context, configBuilder) =>
        {
            var testSettings = new Dictionary<string, string?>
            {
                // Configuração JWT
                { "Jwt:Key", "test-secret-key-please-change-for-ci" },
                { "Jwt:Issuer", "fluxnote-tests" },
                { "Jwt:Audience", "fluxnote-tests" },
                { "Jwt:AccessTokenMinutes", "15" },
                // Configuração de autenticação
                { "Auth:RefreshIdleDays", "7" },
                { "Auth:RefreshAbsoluteDays", "7" },
                { "Auth:RefreshAbsoluteDaysRememberMe", "30" },
                { "Auth:RefreshCookieName", "fluxnote_rt" },
                // Desativar rate limiting para testes
                { "IpRateLimiting:EnableEndpointRateLimiting", "false" },
                // Frontend
                { "Frontend:BaseUrl", "http://localhost:4200" }
            };

            configBuilder.AddInMemoryCollection(testSettings);
        });

        builder.ConfigureServices(services =>
        {
            // Substituir o serviço real de email pelo fake de teste
            services.AddSingleton<TestEmailSender>();
            services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<TestEmailSender>());

            // Substituir o serviço real de IA pelo fake de teste
            services.AddSingleton<TestAIService>();
            services.AddSingleton<IAIService>(sp => sp.GetRequiredService<TestAIService>());

            // Remover registos existentes do DbContext
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<FluxnoteServerContext>));
            if (descriptor != null) services.Remove(descriptor);

            var contextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(FluxnoteServerContext));
            if (contextDescriptor != null) services.Remove(contextDescriptor);

            // Criar e abrir uma conexão SQLite in-memory partilhada para o EF Core
            _connection ??= new SqliteConnection("DataSource=:memory:");
            if (_connection is SqliteConnection sqlite)
            {
                sqlite.Open();
            }

            // Registar o DbContext de teste usando a conexão aberta
            services.AddDbContext<FluxnoteServerContext>(options =>
            {
                options.UseSqlite(_connection);
            });

            // Construir o provider e garantir que a BD é criada
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
