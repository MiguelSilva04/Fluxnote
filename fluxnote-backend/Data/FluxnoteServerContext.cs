using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Emit;
using System.Threading.Tasks;

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
        /// DbSet para convites de equipas (permite gerir convites pendentes e aceites).
        /// </summary>
        public DbSet<Fluxnote.Backend.Models.TeamInvite> TeamInvite { get; set; } = default!;

        /// <summary>
        /// DbSet para documentos colaborativos.
        /// </summary>
        public DbSet<Fluxnote.Backend.Models.Document> Document { get; set; } = default!;
        public DbSet<Fluxnote.Backend.Models.DocumentPermission> DocumentPermission { get; set; } = default!;

        /// <summary>
        /// DbSet para convites de documentos (permite gerir convites pendentes e aceites).
        /// </summary>
        public DbSet<Fluxnote.Backend.Models.DocumentInvite> DocumentInvite { get; set; } = default!;

        public DbSet<Fluxnote.Backend.Models.Folder> Folder { get; set; } = default!;

        /// <summary>
        /// DbSet para ficheiros de contexto de documentos (uso pela IA).
        /// </summary>
        public DbSet<Fluxnote.Backend.Models.DocumentContext> DocumentContext { get; set; } = default!;

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

            builder.Entity<DocumentPermission>(entity =>
            {
                // Relação com TeamMember
                entity.HasOne(dp => dp.TeamMember)
                      .WithMany(tm => tm.DocumentPermissions)
                      .HasForeignKey(dp => dp.TeamMemberId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Relação com Document
                entity.HasOne(dp => dp.Document)
                      .WithMany(d => d.Permissions)
                      .HasForeignKey(dp => dp.DocumentId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Índice único: um TeamMember só pode ter uma permissão por Document
                entity.HasIndex(dp => new { dp.TeamMemberId, dp.DocumentId })
                      .IsUnique();

                // Índices para performance
                entity.HasIndex(dp => dp.DocumentId);
                entity.HasIndex(dp => dp.TeamMemberId);
            });

            builder.Entity<DocumentInvite>(entity =>
            {
                // Index unico no Token
                entity.HasIndex(di => di.Token).IsUnique();

                // Relacao com Document (cascade delete - se documento for apagado, convites tambem)
                entity.HasOne(di => di.Document)
                      .WithMany()
                      .HasForeignKey(di => di.DocumentId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Relacao com TeamMember (restrict delete - nao apagar convite se membro for removido)
                entity.HasOne(di => di.CreatedBy)
                      .WithMany()
                      .HasForeignKey(di => di.CreatedByTeamMemberId)
                      .OnDelete(DeleteBehavior.SetNull);

                // Indices para performance
                entity.HasIndex(di => di.DocumentId);
                entity.HasIndex(di => di.ExpiresAt);
            });

            builder.Entity<TeamInvite>(entity =>
            {
                // Index unico no Token
                entity.HasIndex(ti => ti.Token).IsUnique();

                //// Relacao com Team (cascade delete - se equipa for apagada, convites tambem)
                //entity.HasOne(ti => ti.Team)
                //      .WithMany()
                //      .HasForeignKey(ti => ti.TeamId)
                //      .OnDelete(DeleteBehavior.Cascade);

                // Relacao com TeamMember (restrict delete - nao apagar convite se membro for removido)
                entity.HasOne(ti => ti.CreatedBy)
                      .WithMany()
                      .HasForeignKey(ti => ti.CreatedByTeamMemberId)
                      .OnDelete(DeleteBehavior.SetNull);

                // Indices para performance
                entity.HasIndex(ti => ti.TeamId);
                entity.HasIndex(ti => ti.ExpiresAt);
            });

            builder.Entity<Folder>(entity =>
            {
                // Relação com Team (cascade delete - apagar equipa apaga pastas)
                entity.HasOne(f => f.Team)
                      .WithMany(t => t.Folders)
                      .HasForeignKey(f => f.TeamId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Relação com User (restrict delete)
                entity.HasOne(f => f.CreatedBy)
                      .WithMany()
                      .HasForeignKey(f => f.CreatedById)
                      .OnDelete(DeleteBehavior.Restrict);

                // Relação com Documents (NoAction para evitar ciclos de cascade no SQL Server)
                // O set-null é feito manualmente no FoldersController.DeleteFolder
                entity.HasMany(f => f.Documents)
                      .WithOne(d => d.Folder)
                      .HasForeignKey(d => d.FolderId)
                      .OnDelete(DeleteBehavior.NoAction);

                // Índices
                entity.HasIndex(f => f.TeamId);
            });

            builder.Entity<DocumentContext>(entity =>
            {
                // Relação com Document (cascade delete — apagar documento apaga todos os seus contextos)
                entity.HasOne(dc => dc.Document)
                      .WithMany(d => d.ContextFiles)
                      .HasForeignKey(dc => dc.DocumentId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Relação com User (restrict delete — preservar referência ao uploader)
                entity.HasOne(dc => dc.UploadedBy)
                      .WithMany()
                      .HasForeignKey(dc => dc.UploadedById)
                      .OnDelete(DeleteBehavior.Restrict);

                // Índices para performance
                entity.HasIndex(dc => dc.DocumentId);
                entity.HasIndex(dc => dc.UploadedAt);
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
