using Fluxnote.Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Fluxnote.Backend.Tests.Helpers;

public static class TestDbHelper
{
    /// <summary>
    /// Creates an isolated in-memory EF Core context for each test.
    /// A unique DB name ensures tests don't share state.
    /// </summary>
    public static FluxnoteServerContext CreateInMemoryContext(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<FluxnoteServerContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .Options;

        return new FluxnoteServerContext(options);
    }
}
