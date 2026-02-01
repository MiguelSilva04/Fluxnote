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
    public class FluxnoteServerContext : IdentityDbContext<User>
    {
        public FluxnoteServerContext (DbContextOptions<FluxnoteServerContext> options)
            : base(options)
        {
        }
        public DbSet<Fluxnote.Backend.Models.Team> Team { get; set; } = default!;
        public DbSet<Fluxnote.Backend.Models.TeamMember> TeamMember { get; set; } = default!;

        public DbSet<Fluxnote.Backend.Models.Document> Document { get; set; } = default!;
        public DbSet<Fluxnote.Backend.Models.DocumentPermission> DocumentPermission { get; set; } = default!;
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
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
