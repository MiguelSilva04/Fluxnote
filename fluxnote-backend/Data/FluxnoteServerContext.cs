using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Fluxnote.Backend.Models;

namespace Fluxnote.Backend.Data
{
    public class FluxnoteServerContext : IdentityDbContext<User>
    {
        public FluxnoteServerContext (DbContextOptions<FluxnoteServerContext> options)
            : base(options)
        {
        }

        //public DbSet<Fluxnote.Backend.Models.Person> Person { get; set; } = default!;
        public DbSet<Fluxnote.Backend.Models.Team> Team { get; set; } = default!;
        public DbSet<Fluxnote.Backend.Models.TeamMember> TeamMember { get; set; } = default!;

        public DbSet<Fluxnote.Backend.Models.Document> Document { get; set; } = default!;
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
