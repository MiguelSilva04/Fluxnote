using FluentAssertions;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Services.Authorization;
using Fluxnote.Backend.Tests.Helpers;

namespace Fluxnote.Backend.Tests.Services;

public class TeamAuthorizationServiceTests
{
    private static (TeamAutorizationService svc, FluxnoteServerContext db) Create()
    {
        var db  = TestDbHelper.CreateInMemoryContext();
        var svc = new TeamAutorizationService(db);
        return (svc, db);
    }

    /// Seeds a team with a single member and returns both.
    private static (Team team, TeamMember member) SeedMember(
        FluxnoteServerContext db, string userId, TeamRole role, int teamId = 1)
    {
        var team   = new Team   { Id = teamId, Name = "Team", OwnerId = 0 };
        var member = new TeamMember { Name = "User", UserId = userId, TeamId = teamId, Role = role };
        db.Team.Add(team);
        db.TeamMember.Add(member);
        db.SaveChanges();
        return (team, member);
    }

    // ─── IsTeamOwnerAsync ─────────────────────────────────────

    [Fact]
    public async Task IsTeamOwnerAsync_WhenOwner_ReturnsTrue()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Owner);
        (await svc.IsTeamOwnerAsync(1, "u1")).Should().BeTrue();
    }

    [Fact]
    public async Task IsTeamOwnerAsync_WhenTeamAdmin_ReturnsFalse()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.TeamAdmin);
        (await svc.IsTeamOwnerAsync(1, "u1")).Should().BeFalse();
    }

    [Fact]
    public async Task IsTeamOwnerAsync_WhenMember_ReturnsFalse()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Member);
        (await svc.IsTeamOwnerAsync(1, "u1")).Should().BeFalse();
    }

    [Fact]
    public async Task IsTeamOwnerAsync_WhenUserNotInTeam_ReturnsFalse()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Owner);
        (await svc.IsTeamOwnerAsync(1, "stranger")).Should().BeFalse();
    }

    [Fact]
    public async Task IsTeamOwnerAsync_WhenTeamDoesNotExist_ReturnsFalse()
    {
        var (svc, _) = Create();
        (await svc.IsTeamOwnerAsync(999, "u1")).Should().BeFalse();
    }

    // ─── IsTeamOwnerOrAdminAsync ──────────────────────────────

    [Fact]
    public async Task IsTeamOwnerOrAdminAsync_WhenOwner_ReturnsTrue()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Owner);
        (await svc.IsTeamOwnerOrAdminAsync(1, "u1")).Should().BeTrue();
    }

    [Fact]
    public async Task IsTeamOwnerOrAdminAsync_WhenTeamAdmin_ReturnsTrue()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.TeamAdmin);
        (await svc.IsTeamOwnerOrAdminAsync(1, "u1")).Should().BeTrue();
    }

    [Fact]
    public async Task IsTeamOwnerOrAdminAsync_WhenMember_ReturnsFalse()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Member);
        (await svc.IsTeamOwnerOrAdminAsync(1, "u1")).Should().BeFalse();
    }

    [Fact]
    public async Task IsTeamOwnerOrAdminAsync_WhenUserNotInTeam_ReturnsFalse()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Owner);
        (await svc.IsTeamOwnerOrAdminAsync(1, "stranger")).Should().BeFalse();
    }

    // ─── GetTeamMemberAsync ───────────────────────────────────

    [Fact]
    public async Task GetTeamMemberAsync_WhenMemberExists_ReturnsMember()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Owner);
        var m = await svc.GetTeamMemberAsync(1, "u1");
        m.Should().NotBeNull();
        m!.UserId.Should().Be("u1");
        m.Role.Should().Be(TeamRole.Owner);
    }

    [Fact]
    public async Task GetTeamMemberAsync_WhenMemberDoesNotExist_ReturnsNull()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Owner);
        (await svc.GetTeamMemberAsync(1, "stranger")).Should().BeNull();
    }

    [Fact]
    public async Task GetTeamMemberAsync_WhenWrongTeam_ReturnsNull()
    {
        var (svc, db) = Create();
        SeedMember(db, "u1", TeamRole.Owner, teamId: 1);
        // Query for team 2 where user has no membership
        (await svc.GetTeamMemberAsync(2, "u1")).Should().BeNull();
    }
}
