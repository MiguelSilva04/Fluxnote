using FluentAssertions;
using Fluxnote.Backend.Controllers;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Teams;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace Fluxnote.Backend.Tests.Controllers;

public class TeamMembersControllerTests
{
    private static (TeamMembersController ctrl, FluxnoteServerContext db) Create(string userId = "u1")
    {
        var db   = TestDbHelper.CreateInMemoryContext();
        var ctrl = new TeamMembersController(db)
        {
            ControllerContext = ControllerTestHelper.CreateControllerContext(userId)
        };
        return (ctrl, db);
    }

    private static Team SeedTeam(FluxnoteServerContext db, int teamId = 1)
    {
        var team = new Team { Id = teamId, Name = "Team", OwnerId = 0 };
        db.Team.Add(team);
        db.SaveChanges();
        return team;
    }

    private static TeamMember SeedMember(
        FluxnoteServerContext db, string userId, TeamRole role, int teamId = 1)
    {
        var m = new TeamMember { Name = "User", UserId = userId, TeamId = teamId, Role = role };
        db.TeamMember.Add(m);
        db.SaveChanges();
        return m;
    }

    // ─── POST ─────────────────────────────────────────────────

    [Fact]
    public async Task Post_FirstMemberAsOwner_ReturnsCreated()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);

        var req    = new CreateTeamMemberRequest { Name = "Alice", Role = (int)TeamRole.Owner, TeamId = 1, UserId = "u1" };
        var result = await ctrl.PostTeamMember(req);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
        db.TeamMember.Should().HaveCount(1);
    }

    [Fact]
    public async Task Post_OwnerAddsMember_ReturnsCreated()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);

        var req    = new CreateTeamMemberRequest { Name = "Bob", Role = (int)TeamRole.Member, TeamId = 1, UserId = "u2" };
        var result = await ctrl.PostTeamMember(req);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
        db.TeamMember.Should().HaveCount(2);
    }

    [Fact]
    public async Task Post_NonOwnerAddsMember_ReturnsForbidden()
    {
        var (ctrl, db) = Create("u2");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        SeedMember(db, "u2", TeamRole.Member);

        var req    = new CreateTeamMemberRequest { Name = "Carol", Role = (int)TeamRole.Member, TeamId = 1, UserId = "u3" };
        var result = await ctrl.PostTeamMember(req);

        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Post_DuplicateMember_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);

        // Try to add u1 again
        var req    = new CreateTeamMemberRequest { Name = "Alice Again", Role = (int)TeamRole.Member, TeamId = 1, UserId = "u1" };
        var result = await ctrl.PostTeamMember(req);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Post_SecondOwner_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);

        var req    = new CreateTeamMemberRequest { Name = "Bob", Role = (int)TeamRole.Owner, TeamId = 1, UserId = "u2" };
        var result = await ctrl.PostTeamMember(req);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Post_TeamNotFound_ReturnsNotFound()
    {
        var (ctrl, _) = Create("u1");

        var req    = new CreateTeamMemberRequest { Name = "Alice", Role = (int)TeamRole.Owner, TeamId = 999, UserId = "u1" };
        var result = await ctrl.PostTeamMember(req);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─── PUT ──────────────────────────────────────────────────

    [Fact]
    public async Task Put_OwnerPromotesMemberToAdmin_ReturnsNoContent()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        var m = SeedMember(db, "u2", TeamRole.Member);

        var result = await ctrl.PutTeamMember(m.Id, new UpdateTeamMemberRoleRequest { Role = (int)TeamRole.TeamAdmin });

        result.Should().BeOfType<NoContentResult>();
        db.TeamMember.Find(m.Id)!.Role.Should().Be(TeamRole.TeamAdmin);
    }

    [Fact]
    public async Task Put_NonOwnerChangesRole_ReturnsForbidden()
    {
        var (ctrl, db) = Create("u2");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        SeedMember(db, "u2", TeamRole.TeamAdmin);
        var target = SeedMember(db, "u3", TeamRole.Member);

        var result = await ctrl.PutTeamMember(target.Id, new UpdateTeamMemberRoleRequest { Role = (int)TeamRole.TeamAdmin });

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Put_OwnerChangesOwnRole_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        var owner = SeedMember(db, "u1", TeamRole.Owner);

        var result = await ctrl.PutTeamMember(owner.Id, new UpdateTeamMemberRoleRequest { Role = (int)TeamRole.Member });

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Put_AssignOwnerRole_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        var m = SeedMember(db, "u2", TeamRole.Member);

        var result = await ctrl.PutTeamMember(m.Id, new UpdateTeamMemberRoleRequest { Role = (int)TeamRole.Owner });

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Put_PromoteToAdminUpdatesDocPermissions()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        var m = SeedMember(db, "u2", TeamRole.Member);

        // Give member a Viewer permission on a document
        db.Document.Add(new Document { Id = 1, Title = "D", TeamId = 1, CreatedById = "u1" });
        db.SaveChanges();
        db.DocumentPermission.Add(new DocumentPermission { DocumentId = 1, TeamMemberId = m.Id, Role = DocumentRole.Viewer });
        db.SaveChanges();

        await ctrl.PutTeamMember(m.Id, new UpdateTeamMemberRoleRequest { Role = (int)TeamRole.TeamAdmin });

        db.DocumentPermission.First().Role.Should().Be(DocumentRole.Editor);
    }

    // ─── DELETE ───────────────────────────────────────────────

    [Fact]
    public async Task Delete_OwnerRemovesMember_ReturnsNoContent()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        var m = SeedMember(db, "u2", TeamRole.Member);

        var result = await ctrl.DeleteTeamMember(m.Id);

        result.Should().BeOfType<NoContentResult>();
        db.TeamMember.Should().HaveCount(1);
    }

    [Fact]
    public async Task Delete_AdminRemovesMember_ReturnsNoContent()
    {
        var (ctrl, db) = Create("u2");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        SeedMember(db, "u2", TeamRole.TeamAdmin);
        var m = SeedMember(db, "u3", TeamRole.Member);

        var result = await ctrl.DeleteTeamMember(m.Id);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Delete_AdminRemovesAdmin_ReturnsForbidden()
    {
        var (ctrl, db) = Create("u2");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        SeedMember(db, "u2", TeamRole.TeamAdmin);
        var other = SeedMember(db, "u3", TeamRole.TeamAdmin);

        var result = await ctrl.DeleteTeamMember(other.Id);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Delete_MemberRemovesMember_ReturnsForbidden()
    {
        var (ctrl, db) = Create("u2");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        SeedMember(db, "u2", TeamRole.Member);
        var target = SeedMember(db, "u3", TeamRole.Member);

        var result = await ctrl.DeleteTeamMember(target.Id);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Delete_SelfRemove_ReturnsBadRequest()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        var owner = SeedMember(db, "u1", TeamRole.Owner);

        var result = await ctrl.DeleteTeamMember(owner.Id);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Delete_CascadesDocumentPermissions()
    {
        var (ctrl, db) = Create("u1");
        SeedTeam(db);
        SeedMember(db, "u1", TeamRole.Owner);
        var m = SeedMember(db, "u2", TeamRole.Member);

        db.Document.Add(new Document { Id = 1, Title = "D", TeamId = 1, CreatedById = "u1" });
        db.DocumentPermission.Add(new DocumentPermission { DocumentId = 1, TeamMemberId = m.Id, Role = DocumentRole.Viewer });
        db.SaveChanges();

        await ctrl.DeleteTeamMember(m.Id);

        db.DocumentPermission.Should().BeEmpty();
    }
}
