using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Dtos.Notifications;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.Notifications;

/// <summary>
/// Testes de integração para convites por email (documento e equipa).
/// Cobre: envio de notificação in-app + email, verificação de permissões,
/// validações de negócio e respeito pelas preferências do utilizador.
/// </summary>
public class EmailInviteIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public EmailInviteIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ==================== DOCUMENT INVITE BY EMAIL ====================

    [Fact]
    public async Task DocumentInviteByEmail_AsOwner_SendsNotificationAndCreatesInvite()
    {
        // Arrange
        var ownerEmail = $"doc-invite-owner-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-invite-target-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "Email Invite Doc", "Email Invite Team");

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=1",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verificar que a notificação in-app foi criada
        var targetUserId = await GetUserIdAsync(targetEmail);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.UserId == targetUserId && n.Type == NotificationType.DocumentInvite);
        Assert.NotNull(notification);
        Assert.Contains("Email Invite Doc", notification!.Message);
        Assert.NotNull(notification.TitlePt);
        Assert.NotNull(notification.MessagePt);
        Assert.NotNull(notification.ReferenceToken);
        Assert.Equal(document.Id, notification.ReferenceId);
        Assert.Equal("Document", notification.ReferenceType);

        // Verificar que o email foi enviado
        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        Assert.Equal(targetEmail, emailSender.LastToEmail);
        Assert.NotNull(emailSender.LastNotificationSubject);
        Assert.Contains("Email Invite Doc", emailSender.LastNotificationSubject!);
    }

    [Fact]
    public async Task DocumentInviteByEmail_CreatesInviteRecord()
    {
        // Arrange
        var ownerEmail = $"doc-invite-rec-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-invite-rec-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "Invite Record Doc", "Invite Record Team");

        // Act
        await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=0",
            new { email = targetEmail });

        // Assert - convite criado na BD com role correto
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var invite = await db.DocumentInvite
            .FirstOrDefaultAsync(i => i.DocumentId == document.Id && !i.IsRevoked);
        Assert.NotNull(invite);
        Assert.Equal(DocumentRole.Viewer, invite!.Role);
        Assert.True(invite.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task DocumentInviteByEmail_AsMember_ReturnsForbidden()
    {
        // Arrange
        var ownerEmail = $"doc-inv-forbid-o-{Guid.NewGuid()}@test.com";
        var memberEmail = $"doc-inv-forbid-m-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-inv-forbid-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);
        var memberClient = CreateAuthenticatedClient(memberToken);

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "Forbid Doc", "Forbid Team");

        // Adicionar member à equipa
        var memberUserId = await GetUserIdAsync(memberEmail);
        await AddTeamMemberAsync(document.TeamId, memberUserId, TeamRole.Member, "Member");

        // Act
        var response = await memberClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=1",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DocumentInviteByEmail_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.PostAsJsonAsync(
            "/api/document-invites/by-email?documentId=1&role=1",
            new { email = "test@test.com" });

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DocumentInviteByEmail_UserNotRegistered_ReturnsBadRequest()
    {
        // Arrange
        var ownerEmail = $"doc-inv-noreg-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "NoReg Doc", "NoReg Team");

        // Act - convidar email não registado
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=1",
            new { email = $"nonexistent-{Guid.NewGuid()}@test.com" });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DocumentInviteByEmail_UserAlreadyHasAccess_ReturnsBadRequest()
    {
        // Arrange
        var ownerEmail = $"doc-inv-dup-o-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-inv-dup-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "Dup Access Doc", "Dup Access Team");

        // Adicionar target como membro com permissão
        var targetUserId = await GetUserIdAsync(targetEmail);
        var member = await AddTeamMemberAsync(document.TeamId, targetUserId, TeamRole.Member, "Target");
        await AddDocumentPermissionAsync(member.Id, document.Id, DocumentRole.Viewer);

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=1",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DocumentInviteByEmail_InvalidRole_ReturnsBadRequest()
    {
        // Arrange
        var ownerEmail = $"doc-inv-role-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-inv-role-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "Role Doc", "Role Team");

        // Act - role inválido (99)
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=99",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DocumentInviteByEmail_AllNotificationsDisabled_ReturnsBadRequest()
    {
        // Arrange
        var ownerEmail = $"doc-inv-nonotif-o-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-inv-nonotif-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var targetToken = await LoginAndGetTokenAsync(targetEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);
        var targetClient = CreateAuthenticatedClient(targetToken);

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "NoNotif Doc", "NoNotif Team");

        // Desativar todas as notificações do target
        await targetClient.PutAsJsonAsync("/api/notifications/preferences", new UpdateNotificationPreferenceDto
        {
            EmailEnabled = false,
            InAppEnabled = false,
            Language = "en"
        });

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=1",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DocumentInviteByEmail_DocumentNotFound_ReturnsNotFound()
    {
        // Arrange
        var ownerEmail = $"doc-inv-404-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-inv-404-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            "/api/document-invites/by-email?documentId=999999&role=1",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ==================== TEAM INVITE BY EMAIL ====================

    [Fact]
    public async Task TeamInviteByEmail_AsOwner_SendsNotificationAndCreatesInvite()
    {
        // Arrange
        var ownerEmail = $"team-invite-owner-{Guid.NewGuid()}@test.com";
        var targetEmail = $"team-invite-target-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var team = await CreateTeamAsync(ownerClient, "Email Invite Team");

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/team-invites/by-email?teamId={team.Id}",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verificar notificação in-app
        var targetUserId = await GetUserIdAsync(targetEmail);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.UserId == targetUserId && n.Type == NotificationType.TeamInvite);
        Assert.NotNull(notification);
        Assert.Contains("Email Invite Team", notification!.Message);
        Assert.NotNull(notification.TitlePt);
        Assert.NotNull(notification.MessagePt);
        Assert.NotNull(notification.ReferenceToken);
        Assert.Equal(team.Id, notification.ReferenceId);
        Assert.Equal("Team", notification.ReferenceType);

        // Verificar email enviado
        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        Assert.Equal(targetEmail, emailSender.LastToEmail);
        Assert.NotNull(emailSender.LastNotificationSubject);
        Assert.Contains("Email Invite Team", emailSender.LastNotificationSubject!);
    }

    [Fact]
    public async Task TeamInviteByEmail_AsTeamAdmin_Succeeds()
    {
        // Arrange
        var ownerEmail = $"team-inv-admin-o-{Guid.NewGuid()}@test.com";
        var adminEmail = $"team-inv-admin-a-{Guid.NewGuid()}@test.com";
        var targetEmail = $"team-inv-admin-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);
        var adminClient = CreateAuthenticatedClient(adminToken);

        var team = await CreateTeamAsync(ownerClient, "Admin Invite Team");

        var adminUserId = await GetUserIdAsync(adminEmail);
        await AddTeamMemberAsync(team.Id, adminUserId, TeamRole.TeamAdmin, "Admin");

        // Act
        var response = await adminClient.PostAsJsonAsync(
            $"/api/team-invites/by-email?teamId={team.Id}",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task TeamInviteByEmail_AsMember_ReturnsForbidden()
    {
        // Arrange
        var ownerEmail = $"team-inv-forbid-o-{Guid.NewGuid()}@test.com";
        var memberEmail = $"team-inv-forbid-m-{Guid.NewGuid()}@test.com";
        var targetEmail = $"team-inv-forbid-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);
        var memberClient = CreateAuthenticatedClient(memberToken);

        var team = await CreateTeamAsync(ownerClient, "Forbid Team Email");

        var memberUserId = await GetUserIdAsync(memberEmail);
        await AddTeamMemberAsync(team.Id, memberUserId, TeamRole.Member, "Member");

        // Act
        var response = await memberClient.PostAsJsonAsync(
            $"/api/team-invites/by-email?teamId={team.Id}",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task TeamInviteByEmail_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.PostAsJsonAsync(
            "/api/team-invites/by-email?teamId=1",
            new { email = "test@test.com" });

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TeamInviteByEmail_UserNotRegistered_ReturnsBadRequest()
    {
        // Arrange
        var ownerEmail = $"team-inv-noreg-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var team = await CreateTeamAsync(ownerClient, "NoReg Team Email");

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/team-invites/by-email?teamId={team.Id}",
            new { email = $"nonexistent-{Guid.NewGuid()}@test.com" });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task TeamInviteByEmail_UserAlreadyMember_ReturnsBadRequest()
    {
        // Arrange
        var ownerEmail = $"team-inv-dup-o-{Guid.NewGuid()}@test.com";
        var targetEmail = $"team-inv-dup-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        var team = await CreateTeamAsync(ownerClient, "Dup Member Team");

        // Adicionar target como membro
        var targetUserId = await GetUserIdAsync(targetEmail);
        await AddTeamMemberAsync(team.Id, targetUserId, TeamRole.Member, "Target");

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/team-invites/by-email?teamId={team.Id}",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task TeamInviteByEmail_AllNotificationsDisabled_ReturnsBadRequest()
    {
        // Arrange
        var ownerEmail = $"team-inv-nonotif-o-{Guid.NewGuid()}@test.com";
        var targetEmail = $"team-inv-nonotif-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var targetToken = await LoginAndGetTokenAsync(targetEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);
        var targetClient = CreateAuthenticatedClient(targetToken);

        var team = await CreateTeamAsync(ownerClient, "NoNotif Team Email");

        // Desativar todas as notificações do target
        await targetClient.PutAsJsonAsync("/api/notifications/preferences", new UpdateNotificationPreferenceDto
        {
            EmailEnabled = false,
            InAppEnabled = false,
            Language = "en"
        });

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/team-invites/by-email?teamId={team.Id}",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task TeamInviteByEmail_TeamNotFound_ReturnsNotFound()
    {
        // Arrange
        var ownerEmail = $"team-inv-404-{Guid.NewGuid()}@test.com";
        var targetEmail = $"team-inv-404-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            "/api/team-invites/by-email?teamId=999999",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ==================== NOTIFICATION LANGUAGE PREFERENCES ====================

    [Fact]
    public async Task DocumentInviteByEmail_UserWithPtPreference_SendsPtEmail()
    {
        // Arrange
        var ownerEmail = $"doc-inv-pt-o-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-inv-pt-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var targetToken = await LoginAndGetTokenAsync(targetEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);
        var targetClient = CreateAuthenticatedClient(targetToken);

        // Definir preferência do target para português
        await targetClient.PutAsJsonAsync("/api/notifications/preferences", new UpdateNotificationPreferenceDto
        {
            EmailEnabled = true,
            InAppEnabled = true,
            Language = "pt"
        });

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "Doc PT", "Team PT");

        // Act
        await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=1",
            new { email = targetEmail });

        // Assert - email em português
        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        Assert.Equal(targetEmail, emailSender.LastToEmail);
        Assert.NotNull(emailSender.LastNotificationSubject);
        Assert.Contains("Doc PT", emailSender.LastNotificationSubject!);
        // O subject em PT contém "Foste convidado"
        Assert.Contains("Foste convidado", emailSender.LastNotificationSubject!);
    }

    [Fact]
    public async Task DocumentInviteByEmail_OnlyEmailDisabled_StillCreatesInAppNotification()
    {
        // Arrange
        var ownerEmail = $"doc-inv-noemail-o-{Guid.NewGuid()}@test.com";
        var targetEmail = $"doc-inv-noemail-t-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(targetEmail, "Teste1234!");

        var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
        var targetToken = await LoginAndGetTokenAsync(targetEmail, "Teste1234!");
        var ownerClient = CreateAuthenticatedClient(ownerToken);
        var targetClient = CreateAuthenticatedClient(targetToken);

        // Desativar apenas email, manter in-app
        await targetClient.PutAsJsonAsync("/api/notifications/preferences", new UpdateNotificationPreferenceDto
        {
            EmailEnabled = false,
            InAppEnabled = true,
            Language = "en"
        });

        var document = await CreateDocumentAsOwnerAsync(ownerClient, "InApp Only Doc", "InApp Only Team");

        // Act
        var response = await ownerClient.PostAsJsonAsync(
            $"/api/document-invites/by-email?documentId={document.Id}&role=1",
            new { email = targetEmail });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verificar que notificação in-app foi criada
        var targetUserId = await GetUserIdAsync(targetEmail);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.UserId == targetUserId && n.Type == NotificationType.DocumentInvite);
        Assert.NotNull(notification);
    }

    // ==================== HELPER METHODS ====================

    private async Task CreateAndConfirmUserAsync(string email, string password)
    {
        var registerRequest = new RegisterRequest
        {
            Email = email,
            Password = password,
            FullName = "Test User"
        };

        await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        var link = emailSender.LastConfirmationLink;

        if (link != null)
        {
            var uri = new Uri(link);
            var qs = HttpUtility.ParseQueryString(uri.Query);
            var userId = qs["userId"];
            var token = qs["token"];

            await _client.GetAsync($"/api/auth/confirm-email?userId={Uri.EscapeDataString(userId!)}&token={Uri.EscapeDataString(token!)}");
        }
    }

    private async Task<string> LoginAndGetTokenAsync(string email, string password)
    {
        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password,
            RememberMe = false
        };

        var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        return body!.AccessToken;
    }

    private HttpClient CreateAuthenticatedClient(string accessToken)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private async Task<string> GetUserIdAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        return user?.Id ?? "";
    }

    private async Task<DocumentDto> CreateDocumentAsOwnerAsync(HttpClient ownerClient, string title, string teamName)
    {
        var request = new CreateDocumentRequest
        {
            Title = title,
            TeamName = teamName
        };

        var response = await ownerClient.PostAsJsonAsync("/api/documents", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<DocumentDto>())!;
    }

    private async Task<Team> CreateTeamAsync(HttpClient ownerClient, string teamName)
    {
        var response = await ownerClient.PostAsJsonAsync("/api/teams", new { Name = teamName });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Team>())!;
    }

    private async Task<TeamMember> AddTeamMemberAsync(int teamId, string userId, TeamRole role, string name)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

        var member = new TeamMember
        {
            Name = name,
            UserId = userId,
            TeamId = teamId,
            Role = role,
            JoinedAt = DateTime.UtcNow
        };

        db.TeamMember.Add(member);
        await db.SaveChangesAsync();
        return member;
    }

    private async Task AddDocumentPermissionAsync(int teamMemberId, int documentId, DocumentRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

        var permission = new DocumentPermission
        {
            TeamMemberId = teamMemberId,
            DocumentId = documentId,
            Role = role
        };

        db.DocumentPermission.Add(permission);
        await db.SaveChangesAsync();
    }
}
