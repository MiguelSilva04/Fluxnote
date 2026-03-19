using FluentAssertions;
using Fluxnote.Backend.Controllers;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Notifications;
using Fluxnote.Backend.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Fluxnote.Backend.Tests.Controllers;

public class DocumentPermissionsControllerTests
{
    private static (DocumentPermissionsController ctrl, FluxnoteServerContext db) Create(string userId = "u1")
    {
        var db   = TestDbHelper.CreateInMemoryContext();
        var mockNotification = new Mock<INotificationService>();
        var ctrl = new DocumentPermissionsController(db, mockNotification.Object)
        {
            ControllerContext = ControllerTestHelper.CreateControllerContext(userId)
        };
        return (ctrl, db);
    }

    /// Seeds team(1), owner(u1), member(u2), document(1).
    private static void SeedBase(
        FluxnoteServerContext db,
        out TeamMember ownerMember,
        out TeamMember regularMember,
        out Document   doc)
    {
        var team = new Team { Id = 1, Name = "T", OwnerId = 0 };
        db.Team.Add(team);
        ownerMember   = new TeamMember { Name = "Owner",  UserId = "u1", TeamId = 1, Role = TeamRole.Owner  };
        regularMember = new TeamMember { Name = "Member", UserId = "u2", TeamId = 1, Role = TeamRole.Member };
        db.TeamMember.Add(ownerMember);
        db.TeamMember.Add(regularMember);
        doc = new Document { Id = 1, Title = "Doc", TeamId = 1, CreatedById = "u1" };
        db.Document.Add(doc);
        db.SaveChanges();
    }

    // ─── GET ──────────────────────────────────────────────────

    [Fact]
    public async Task Get_TeamMemberSeesPermissions_ReturnsOk()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out _, out var member, out _);
        db.DocumentPermission.Add(new DocumentPermission { DocumentId = 1, TeamMemberId = member.Id, Role = DocumentRole.Viewer });
        db.SaveChanges();

        var result = await ctrl.GetByDocument(1);

        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Get_NonMemberForbidden_ReturnsForbidden()
    {
        var (ctrl, db) = Create("stranger");
        SeedBase(db, out _, out _, out _);

        var result = await ctrl.GetByDocument(1);

        result.Result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Get_DocumentNotFound_ReturnsNotFound()
    {
        var (ctrl, _) = Create("u1");

        var result = await ctrl.GetByDocument(999);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─── POST ─────────────────────────────────────────────────

    [Fact]
    public async Task Post_OwnerGrantsPermission_ReturnsCreated()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out _, out var member, out _);

        var req    = new CreateDocumentPermissionRequest { DocumentId = 1, TeamMemberId = member.Id, Role = (int)DocumentRole.Viewer };
        var result = await ctrl.CreatePermission(req);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
        db.DocumentPermission.Should().HaveCount(1);
    }

    [Fact]
    public async Task Post_AdminGrantsPermission_ReturnsCreated()
    {
        var (ctrl, db) = Create("u3");
        SeedBase(db, out _, out var member, out _);
        var admin = new TeamMember { Name = "Admin", UserId = "u3", TeamId = 1, Role = TeamRole.TeamAdmin };
        db.TeamMember.Add(admin);
        db.SaveChanges();

        var req    = new CreateDocumentPermissionRequest { DocumentId = 1, TeamMemberId = member.Id, Role = (int)DocumentRole.Editor };
        var result = await ctrl.CreatePermission(req);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
    }

    [Fact]
    public async Task Post_MemberForbidden_ReturnsForbidden()
    {
        var (ctrl, db) = Create("u2");
        SeedBase(db, out var owner, out _, out _);

        var req    = new CreateDocumentPermissionRequest { DocumentId = 1, TeamMemberId = owner.Id, Role = (int)DocumentRole.Viewer };
        var result = await ctrl.CreatePermission(req);

        result.Result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Post_GrantToOwner_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out var owner, out _, out _);

        var req    = new CreateDocumentPermissionRequest { DocumentId = 1, TeamMemberId = owner.Id, Role = (int)DocumentRole.Viewer };
        var result = await ctrl.CreatePermission(req);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Post_AdminGrantsToTeamAdmin_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u3");
        SeedBase(db, out _, out _, out _);
        var admin1 = new TeamMember { Name = "Admin1", UserId = "u3", TeamId = 1, Role = TeamRole.TeamAdmin };
        var admin2 = new TeamMember { Name = "Admin2", UserId = "u4", TeamId = 1, Role = TeamRole.TeamAdmin };
        db.TeamMember.Add(admin1);
        db.TeamMember.Add(admin2);
        db.SaveChanges();

        var req    = new CreateDocumentPermissionRequest { DocumentId = 1, TeamMemberId = admin2.Id, Role = (int)DocumentRole.Editor };
        var result = await ctrl.CreatePermission(req);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Post_TeamAdminAlwaysGetsEditorRole()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out _, out _, out _);
        var admin = new TeamMember { Name = "Admin", UserId = "u3", TeamId = 1, Role = TeamRole.TeamAdmin };
        db.TeamMember.Add(admin);
        db.SaveChanges();

        // Owner tries to grant Viewer to a TeamAdmin — should be promoted to Editor
        var req = new CreateDocumentPermissionRequest { DocumentId = 1, TeamMemberId = admin.Id, Role = (int)DocumentRole.Viewer };
        await ctrl.CreatePermission(req);

        db.DocumentPermission.First().Role.Should().Be(DocumentRole.Editor);
    }

    [Fact]
    public async Task Post_DuplicatePermission_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out _, out var member, out _);
        db.DocumentPermission.Add(new DocumentPermission { DocumentId = 1, TeamMemberId = member.Id, Role = DocumentRole.Viewer });
        db.SaveChanges();

        var req    = new CreateDocumentPermissionRequest { DocumentId = 1, TeamMemberId = member.Id, Role = (int)DocumentRole.Editor };
        var result = await ctrl.CreatePermission(req);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ─── PUT ──────────────────────────────────────────────────

    [Fact]
    public async Task Put_OwnerUpdatesMemberPermission_ReturnsNoContent()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out _, out var member, out _);
        var perm = new DocumentPermission { DocumentId = 1, TeamMemberId = member.Id, Role = DocumentRole.Viewer };
        db.DocumentPermission.Add(perm);
        db.SaveChanges();

        var result = await ctrl.UpdatePermission(perm.Id, new UpdateDocumentPermissionRequest { Role = (int)DocumentRole.Editor });

        result.Should().BeOfType<NoContentResult>();
        db.DocumentPermission.Find(perm.Id)!.Role.Should().Be(DocumentRole.Editor);
    }

    [Fact]
    public async Task Put_TeamAdminRoleIsImmutable_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out _, out _, out _);
        var admin = new TeamMember { Name = "Admin", UserId = "u3", TeamId = 1, Role = TeamRole.TeamAdmin };
        db.TeamMember.Add(admin);
        db.SaveChanges();
        var perm = new DocumentPermission { DocumentId = 1, TeamMemberId = admin.Id, Role = DocumentRole.Editor };
        db.DocumentPermission.Add(perm);
        db.SaveChanges();

        var result = await ctrl.UpdatePermission(perm.Id, new UpdateDocumentPermissionRequest { Role = (int)DocumentRole.Viewer });

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ─── DELETE ───────────────────────────────────────────────

    [Fact]
    public async Task Delete_OwnerDeletesPermission_ReturnsNoContent()
    {
        var (ctrl, db) = Create("u1");
        SeedBase(db, out _, out var member, out _);
        var perm = new DocumentPermission { DocumentId = 1, TeamMemberId = member.Id, Role = DocumentRole.Viewer };
        db.DocumentPermission.Add(perm);
        db.SaveChanges();

        var result = await ctrl.DeletePermission(perm.Id);

        result.Should().BeOfType<NoContentResult>();
        db.DocumentPermission.Should().BeEmpty();
    }

    [Fact]
    public async Task Delete_AdminCannotDeleteOwnerPermission_ReturnsForbidden()
    {
        var (ctrl, db) = Create("u3");
        SeedBase(db, out var owner, out _, out _);
        var admin = new TeamMember { Name = "Admin", UserId = "u3", TeamId = 1, Role = TeamRole.TeamAdmin };
        db.TeamMember.Add(admin);
        db.SaveChanges();
        // Seed owner permission directly (bypassing controller which would reject it)
        var perm = new DocumentPermission { DocumentId = 1, TeamMemberId = owner.Id, Role = DocumentRole.Editor };
        db.DocumentPermission.Add(perm);
        db.SaveChanges();

        var result = await ctrl.DeletePermission(perm.Id);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Delete_PermissionNotFound_ReturnsNotFound()
    {
        var (ctrl, _) = Create("u1");

        var result = await ctrl.DeletePermission(999);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Delete_MemberForbidden_ReturnsForbidden()
    {
        var (ctrl, db) = Create("u2");
        SeedBase(db, out _, out var member, out _);
        var perm = new DocumentPermission { DocumentId = 1, TeamMemberId = member.Id, Role = DocumentRole.Viewer };
        db.DocumentPermission.Add(perm);
        db.SaveChanges();

        var result = await ctrl.DeletePermission(perm.Id);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }
}
