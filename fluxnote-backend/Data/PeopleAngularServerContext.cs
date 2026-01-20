using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Fluxnote.Backend.Models;

namespace Fluxnote.Backend.Data
{
    public class FluxnoteServerContext : DbContext
    {
        public FluxnoteServerContext (DbContextOptions<FluxnoteServerContext> options)
            : base(options)
        {
        }

        public DbSet<Fluxnote.Backend.Models.Person> Person { get; set; } = default!;
    }
}
