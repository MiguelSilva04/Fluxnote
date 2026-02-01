using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Fluxnote.Backend.Models;

namespace Fluxnote.Backend.Data
{
    /// <summary>
    /// Contexto principal do Entity Framework Core para a aplicação Fluxnote.
    /// Estende IdentityDbContext para integração com ASP.NET Core Identity.
    /// </summary>
    /// <remarks>
    /// <b>Herança:</b><br/>
    /// IdentityDbContext&lt;User&gt; fornece automaticamente as tabelas do Identity:
    /// <list type="bullet">
    ///     <item><description>AspNetUsers (mapeado para User)</description></item>
    ///     <item><description>AspNetRoles, AspNetUserRoles, AspNetUserClaims, etc.</description></item>
    /// </list>
    ///
    /// <b>DbSets Adicionais:</b>
    /// <list type="table">
    ///     <listheader>
    ///         <term>DbSet</term>
    ///         <description>Descrição</description>
    ///     </listheader>
    ///     <item><term>Team</term><description>Equipas colaborativas</description></item>
    ///     <item><term>TeamMember</term><description>Membros de equipas com papéis</description></item>
    ///     <item><term>Document</term><description>Documentos colaborativos</description></item>
    ///     <item><term>RefreshTokens</term><description>Tokens de atualização para sessões</description></item>
    /// </list>
    ///
    /// <b>Relacionamentos Configurados:</b>
    /// <list type="bullet">
    ///     <item><description>RefreshToken → User: Cascade delete</description></item>
    ///     <item><description>Document → Team: Cascade delete</description></item>
    ///     <item><description>Document → User (CreatedBy): Restrict delete</description></item>
    /// </list>
    ///
    /// <b>Connection String (appsettings.json):</b>
    /// <code>"FluxnoteServerContext": "Server=(localdb)\\mssqllocaldb;Database=FluxnoteDB"</code>
    /// </remarks>
    public class FluxnoteServerContext : IdentityDbContext<User>
    {
        /// <summary>
        /// Construtor com injeção de opções de configuração.
        /// </summary>
        /// <param name="options">Opções do contexto (connection string, provider, etc.).</param>
        public FluxnoteServerContext(DbContextOptions<FluxnoteServerContext> options)
            : base(options)
        {
        }

        /// <summary>
        /// DbSet para equipas colaborativas.
        /// </summary>
        public DbSet<Fluxnote.Backend.Models.Team> Team { get; set; } = default!;

        /// <summary>
        /// DbSet para membros de equipas.
        /// </summary>
        public DbSet<Fluxnote.Backend.Models.TeamMember> TeamMember { get; set; } = default!;

        /// <summary>
        /// DbSet para documentos colaborativos.
        /// </summary>
        public DbSet<Fluxnote.Backend.Models.Document> Document { get; set; } = default!;

        /// <summary>
        /// DbSet para refresh tokens de autenticação.
        /// </summary>
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        /// <summary>
        /// Configuração do modelo de dados via Fluent API.
        /// Define relacionamentos, índices e configurações específicas do provider.
        /// </summary>
        /// <param name="builder">Builder para configuração do modelo.</param>
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<RefreshToken>(entity =>
            {
                entity.HasIndex(x => x.TokenHash).IsUnique();

                entity.HasOne(x => x.User)
                      .WithMany() // por agora sem navegação no User
                      .HasForeignKey(x => x.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.Property(x => x.TokenHash).HasMaxLength(64);
            });

            builder.Entity<Document>(entity =>
            {
                // Relação com Team
                entity.HasOne(d => d.Team)
                      .WithMany(t => t.Documents)
                      .HasForeignKey(d => d.TeamId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Relação com User (criador)
                entity.HasOne(d => d.CreatedBy)
                      .WithMany()
                      .HasForeignKey(d => d.CreatedById)
                      .OnDelete(DeleteBehavior.Restrict); // Não apagar documento se user for apagado

                // Índices
                entity.HasIndex(d => d.TeamId);
                entity.HasIndex(d => d.CreatedById);
                entity.HasIndex(d => d.IsDeleted);
            });

            // Configuração específica para SQL Server (SQLite usa BLOB por defeito)
            if (Database.IsSqlServer())
            {
                builder.Entity<Document>()
                    .Property(d => d.Content)
                    .HasColumnType("varbinary(max)");
            }
        }
    }
}
