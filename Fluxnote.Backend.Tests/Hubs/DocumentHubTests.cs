using System.Reflection;
using FluentAssertions;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Hubs;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Helpers;
using Microsoft.Extensions.Logging.Abstractions;

namespace Fluxnote.Backend.Tests.Hubs;

public class DocumentHubTests
{
    private static (DocumentHub hub, FluxnoteServerContext db) Create()
    {
        var db  = TestDbHelper.CreateInMemoryContext();
        var hub = new DocumentHub(db, NullLogger<DocumentHub>.Instance);
        return (hub, db);
    }

    /// Seeds a team + one member + one document. Returns all three.
    private static (Team team, TeamMember member, Document doc) SeedTeamMemberDoc(
        FluxnoteServerContext db,
        string userId,
        TeamRole role,
        bool docDeleted = false,
        int teamId = 1,
        int docId  = 1)
    {
        var team   = new Team   { Id = teamId, Name = "T", OwnerId = 0 };
        var member = new TeamMember { Name = "U", UserId = userId, TeamId = teamId, Role = role };
        db.Team.Add(team);
        db.TeamMember.Add(member);
        db.SaveChanges();

        var doc = new Document
        {
            Id          = docId,
            Title       = "Doc",
            TeamId      = teamId,
            CreatedById = userId,
            IsDeleted   = docDeleted
        };
        db.Document.Add(doc);
        db.SaveChanges();

        return (team, member, doc);
    }

    // ─── Reflection helpers ───────────────────────────────────

    private static Task<bool> CallHasDocumentAccess(DocumentHub hub, string userId, int docId)
    {
        var m = typeof(DocumentHub).GetMethod(
            "HasDocumentAccess", BindingFlags.NonPublic | BindingFlags.Instance)!;
        return (Task<bool>)m.Invoke(hub, new object[] { userId, docId })!;
    }

    private static Task<bool> CallHasWriteAccess(DocumentHub hub, string userId, int docId)
    {
        var m = typeof(DocumentHub).GetMethod(
            "HasWriteAccess", BindingFlags.NonPublic | BindingFlags.Instance)!;
        return (Task<bool>)m.Invoke(hub, new object[] { userId, docId })!;
    }

    private static Task CallCreateVersionAsync(DocumentHub hub, string userId, int docId, string? html = null)
    {
        var m = typeof(DocumentHub).GetMethod(
            "CreateVersionAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
        return (Task)m.Invoke(hub, new object?[] { userId, docId, html })!;
    }

    // ─── HasDocumentAccess ────────────────────────────────────

    [Fact]
    public async Task HasDocumentAccess_WhenOwner_ReturnsTrue()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Owner);
        (await CallHasDocumentAccess(hub, "u1", 1)).Should().BeTrue();
    }

    [Fact]
    public async Task HasDocumentAccess_WhenTeamAdmin_ReturnsTrue()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.TeamAdmin);
        (await CallHasDocumentAccess(hub, "u1", 1)).Should().BeTrue();
    }

    [Fact]
    public async Task HasDocumentAccess_WhenMemberWithPermission_ReturnsTrue()
    {
        var (hub, db) = Create();
        var (_, member, doc) = SeedTeamMemberDoc(db, "u1", TeamRole.Member);
        db.DocumentPermission.Add(new DocumentPermission
        {
            DocumentId   = doc.Id,
            TeamMemberId = member.Id,
            Role         = DocumentRole.Viewer
        });
        db.SaveChanges();
        (await CallHasDocumentAccess(hub, "u1", 1)).Should().BeTrue();
    }

    [Fact]
    public async Task HasDocumentAccess_WhenMemberWithoutPermission_ReturnsFalse()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Member);
        (await CallHasDocumentAccess(hub, "u1", 1)).Should().BeFalse();
    }

    [Fact]
    public async Task HasDocumentAccess_WhenUserNotInTeam_ReturnsFalse()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Owner);
        (await CallHasDocumentAccess(hub, "stranger", 1)).Should().BeFalse();
    }

    [Fact]
    public async Task HasDocumentAccess_WhenDocumentDeleted_ReturnsFalse()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Owner, docDeleted: true);
        (await CallHasDocumentAccess(hub, "u1", 1)).Should().BeFalse();
    }

    [Fact]
    public async Task HasDocumentAccess_WhenDocumentNotFound_ReturnsFalse()
    {
        var (hub, _) = Create();
        (await CallHasDocumentAccess(hub, "u1", 999)).Should().BeFalse();
    }

    // ─── HasWriteAccess ───────────────────────────────────────

    [Fact]
    public async Task HasWriteAccess_WhenOwner_ReturnsTrue()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Owner);
        (await CallHasWriteAccess(hub, "u1", 1)).Should().BeTrue();
    }

    [Fact]
    public async Task HasWriteAccess_WhenTeamAdmin_ReturnsTrue()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.TeamAdmin);
        (await CallHasWriteAccess(hub, "u1", 1)).Should().BeTrue();
    }

    [Fact]
    public async Task HasWriteAccess_WhenMemberWithEditorRole_ReturnsTrue()
    {
        var (hub, db) = Create();
        var (_, member, doc) = SeedTeamMemberDoc(db, "u1", TeamRole.Member);
        db.DocumentPermission.Add(new DocumentPermission
        {
            DocumentId   = doc.Id,
            TeamMemberId = member.Id,
            Role         = DocumentRole.Editor
        });
        db.SaveChanges();
        (await CallHasWriteAccess(hub, "u1", 1)).Should().BeTrue();
    }

    [Fact]
    public async Task HasWriteAccess_WhenMemberWithViewerRole_ReturnsFalse()
    {
        var (hub, db) = Create();
        var (_, member, doc) = SeedTeamMemberDoc(db, "u1", TeamRole.Member);
        db.DocumentPermission.Add(new DocumentPermission
        {
            DocumentId   = doc.Id,
            TeamMemberId = member.Id,
            Role         = DocumentRole.Viewer
        });
        db.SaveChanges();
        (await CallHasWriteAccess(hub, "u1", 1)).Should().BeFalse();
    }

    [Fact]
    public async Task HasWriteAccess_WhenMemberWithoutPermission_ReturnsFalse()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Member);
        (await CallHasWriteAccess(hub, "u1", 1)).Should().BeFalse();
    }

    // ─── CreateVersionAsync ───────────────────────────────────

    [Fact]
    public async Task CreateVersionAsync_WhenSnapshotPresent_CreatesVersion()
    {
        var (hub, db) = Create();
        var (_, _, doc) = SeedTeamMemberDoc(db, "u1", TeamRole.Owner);
        doc.YDocSnapshot = new byte[] { 1, 2, 3 };
        db.Users.Add(new User { Id = "u1", UserName = "user1", FullName = "User One" });
        db.SaveChanges();

        await CallCreateVersionAsync(hub, "u1", doc.Id);

        db.DocumentVersion.Should().HaveCount(1);
        var v = db.DocumentVersion.First();
        v.AuthorId.Should().Be("u1");
        v.AuthorName.Should().Be("User One");
        v.Summary.Should().Be("Session by User One");
    }

    [Fact]
    public async Task CreateVersionAsync_WhenNoSnapshot_SkipsVersion()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Owner);
        // YDocSnapshot is null by default

        await CallCreateVersionAsync(hub, "u1", 1);

        db.DocumentVersion.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateVersionAsync_WhenDocumentDeleted_SkipsVersion()
    {
        var (hub, db) = Create();
        SeedTeamMemberDoc(db, "u1", TeamRole.Owner, docDeleted: true);

        await CallCreateVersionAsync(hub, "u1", 1);

        db.DocumentVersion.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateVersionAsync_WhenUserNotFound_UsesUnknown()
    {
        var (hub, db) = Create();
        var (_, _, doc) = SeedTeamMemberDoc(db, "u1", TeamRole.Owner);
        doc.YDocSnapshot = new byte[] { 1 };
        db.SaveChanges();
        // No User seeded — hub falls back to "Unknown"

        await CallCreateVersionAsync(hub, "u1", doc.Id);

        db.DocumentVersion.Should().HaveCount(1);
        db.DocumentVersion.First().AuthorName.Should().Be("Unknown");
    }
}
