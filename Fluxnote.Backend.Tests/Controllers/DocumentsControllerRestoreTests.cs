using FluentAssertions;
using Fluxnote.Backend.Controllers;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Hubs;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.AI;
using Fluxnote.Backend.Services.Notifications;
using Fluxnote.Backend.Services.Storage;
using Fluxnote.Backend.Tests.Helpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Moq;

namespace Fluxnote.Backend.Tests.Controllers;

public class DocumentsControllerRestoreTests
{
    // ─────────────────────────────────────────────────────────────
    // Factory
    // ─────────────────────────────────────────────────────────────

    private static (DocumentsController ctrl, FluxnoteServerContext db, Mock<IHubContext<DocumentHub>> hub)
        Create(string userId = "u1")
    {
        var db = TestDbHelper.CreateInMemoryContext();

        var mockUserStore  = new Mock<IUserStore<User>>();
        var mockUserMgr    = new Mock<UserManager<User>>(
            mockUserStore.Object, null, null, null, null, null, null, null, null);

        var mockAI      = new Mock<IAIService>();
        var mockStorage = new Mock<IStorageService>();
        var mockText    = new Mock<ITextExtractionService>();

        // Mock IHubContext so SendAsync calls succeed silently
        var mockProxy   = new Mock<IClientProxy>();
        mockProxy
            .Setup(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var mockClients = new Mock<IHubClients>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockProxy.Object);

        var mockHub = new Mock<IHubContext<DocumentHub>>();
        mockHub.Setup(h => h.Clients).Returns(mockClients.Object);

        var mockNotification = new Mock<INotificationService>();
        var ctrl = new DocumentsController(db, mockUserMgr.Object, mockAI.Object, mockStorage.Object, mockText.Object, mockHub.Object, mockNotification.Object)
        {
            ControllerContext = ControllerTestHelper.CreateControllerContext(userId)
        };

        return (ctrl, db, mockHub);
    }

    /// Seeds team(1), document(1) with YDocSnapshot, and a DocumentVersion(1).
    private static void SeedBase(
        FluxnoteServerContext db,
        out TeamMember        ownerMember,
        out Document          doc,
        out DocumentVersion   version)
    {
        var user = new User { Id = "u1", UserName = "owner@test.com", FullName = "Owner User" };
        db.Users.Add(user);

        var team = new Team { Id = 1, Name = "T", OwnerId = 0 };
        db.Team.Add(team);

        ownerMember = new TeamMember { Name = "Owner", UserId = "u1", TeamId = 1, Role = TeamRole.Owner };
        db.TeamMember.Add(ownerMember);

        doc = new Document
        {
            Id         = 1,
            Title      = "Doc",
            TeamId     = 1,
            CreatedById = "u1",
            YDocSnapshot = new byte[] { 0x01, 0x02 }
        };
        db.Document.Add(doc);

        version = new DocumentVersion
        {
            Id           = 1,
            DocumentId   = 1,
            AuthorId     = "u1",
            AuthorName   = "Owner User",
            CreatedAt    = DateTime.UtcNow.AddMinutes(-10),
            Summary      = "Session by Owner User",
            YDocSnapshot = new byte[] { 0xAA, 0xBB },
            ContentHtml  = System.Text.Encoding.UTF8.GetBytes("<p>Old content</p>")
        };
        db.DocumentVersion.Add(version);

        db.SaveChanges();
    }

    // ─────────────────────────────────────────────────────────────
    // Happy path
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreVersion_Owner_ReturnsNoContent()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        var result = await ctrl.RestoreVersion(1, version.Id);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task RestoreVersion_Owner_UpdatesDocumentSnapshot()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        await ctrl.RestoreVersion(1, version.Id);

        var updatedDoc = db.Document.Find(1)!;
        updatedDoc.YDocSnapshot.Should().BeEquivalentTo(version.YDocSnapshot);
        updatedDoc.Content.Should().BeEquivalentTo(version.ContentHtml);
    }

    [Fact]
    public async Task RestoreVersion_Owner_UpdatesDocumentUpdatedAt()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);
        var before = DateTime.UtcNow.AddSeconds(-1);

        await ctrl.RestoreVersion(1, version.Id);

        db.Document.Find(1)!.UpdatedAt.Should().BeAfter(before);
    }

    [Fact]
    public async Task RestoreVersion_Owner_CreatesNewVersionEntry()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        await ctrl.RestoreVersion(1, version.Id);

        // One original version + one new restore-version
        db.DocumentVersion.Should().HaveCount(2);
    }

    [Fact]
    public async Task RestoreVersion_Owner_NewVersionHasRestoredByPrefix()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        await ctrl.RestoreVersion(1, version.Id);

        var newVersion = db.DocumentVersion.OrderByDescending(v => v.CreatedAt).First();
        newVersion.Summary.Should().StartWith("RESTORED_BY|");
    }

    [Fact]
    public async Task RestoreVersion_Owner_NewVersionContainsAuthorName()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        await ctrl.RestoreVersion(1, version.Id);

        var newVersion = db.DocumentVersion.OrderByDescending(v => v.CreatedAt).First();
        newVersion.Summary.Should().Be("RESTORED_BY|Owner User");
        newVersion.AuthorName.Should().Be("Owner User");
    }

    [Fact]
    public async Task RestoreVersion_Owner_NewVersionCopiesSnapshotFromRestoredVersion()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        await ctrl.RestoreVersion(1, version.Id);

        var newVersion = db.DocumentVersion.OrderByDescending(v => v.CreatedAt).First();
        newVersion.YDocSnapshot.Should().BeEquivalentTo(version.YDocSnapshot);
        newVersion.ContentHtml.Should().BeEquivalentTo(version.ContentHtml);
    }

    [Fact]
    public async Task RestoreVersion_Owner_BroadcastsDocumentRestoredSignalR()
    {
        var (ctrl, db, mockHub) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        await ctrl.RestoreVersion(1, version.Id);

        mockHub.Verify(h => h.Clients.Group("doc-1"), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────
    // Authorization
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreVersion_TeamAdmin_Returns403()
    {
        var (ctrl, db, _) = Create("u2");
        SeedBase(db, out _, out _, out var version);
        db.TeamMember.Add(new TeamMember { Name = "Admin", UserId = "u2", TeamId = 1, Role = TeamRole.TeamAdmin });
        db.SaveChanges();

        var result = await ctrl.RestoreVersion(1, version.Id);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task RestoreVersion_RegularMember_Returns403()
    {
        var (ctrl, db, _) = Create("u3");
        SeedBase(db, out _, out _, out var version);
        db.TeamMember.Add(new TeamMember { Name = "Member", UserId = "u3", TeamId = 1, Role = TeamRole.Member });
        db.SaveChanges();

        var result = await ctrl.RestoreVersion(1, version.Id);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task RestoreVersion_NonMember_Returns403()
    {
        var (ctrl, db, _) = Create("stranger");
        SeedBase(db, out _, out _, out var version);

        var result = await ctrl.RestoreVersion(1, version.Id);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    // ─────────────────────────────────────────────────────────────
    // Not found
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreVersion_DocumentNotFound_Returns404()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);

        var result = await ctrl.RestoreVersion(999, version.Id);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task RestoreVersion_DeletedDocument_Returns404()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out var doc, out var version);
        doc.IsDeleted = true;
        db.SaveChanges();

        var result = await ctrl.RestoreVersion(1, version.Id);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task RestoreVersion_VersionNotFound_Returns404()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out _);

        var result = await ctrl.RestoreVersion(1, 999);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task RestoreVersion_VersionBelongsToOtherDocument_Returns404()
    {
        var (ctrl, db, _) = Create("u1");
        SeedBase(db, out _, out _, out var version);
        // version.DocumentId = 1, but we ask for document 2
        db.Document.Add(new Document { Id = 2, Title = "Other", TeamId = 1, CreatedById = "u1" });
        db.SaveChanges();

        var result = await ctrl.RestoreVersion(2, version.Id);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─────────────────────────────────────────────────────────────
    // Unknown user (fallback author name)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreVersion_UserNotInUsersTable_UsesUnknownFallback()
    {
        var (ctrl, db, _) = Create("ghost");
        SeedBase(db, out _, out _, out var version);
        // Seed a team member for "ghost" but no User record
        db.TeamMember.Add(new TeamMember { Name = "Ghost", UserId = "ghost", TeamId = 1, Role = TeamRole.Owner });
        // Remove the existing owner so ghost becomes the only owner
        var existing = db.TeamMember.First(m => m.UserId == "u1");
        existing.Role = TeamRole.Member;
        db.SaveChanges();

        await ctrl.RestoreVersion(1, version.Id);

        var newVersion = db.DocumentVersion.OrderByDescending(v => v.CreatedAt).First();
        newVersion.Summary.Should().Be("RESTORED_BY|Unknown");
    }
}
