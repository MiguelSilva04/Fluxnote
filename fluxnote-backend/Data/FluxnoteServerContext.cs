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
        }
    }
}
