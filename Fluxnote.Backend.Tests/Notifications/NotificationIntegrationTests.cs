using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
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
/// Testes de integração para o controlador de notificações.
/// Cobre: listagem, filtros, leitura, eliminação e preferências.
/// </summary>
public class NotificationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public NotificationIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ==================== GET NOTIFICATIONS ====================

    [Fact]
    public async Task GetNotifications_WithAuth_ReturnsOk()
    {
        // Arrange
        var email = $"notif-get-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var authClient = CreateAuthenticatedClient(token);

        // Act
        var response = await authClient.GetAsync("/api/notifications");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var notifications = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
        Assert.NotNull(notifications);
    }

    [Fact]
    public async Task GetNotifications_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/notifications");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetNotifications_ReturnsUserNotificationsOnly()
    {
        // Arrange - criar dois utilizadores e inserir notificações para cada
        var email1 = $"notif-own1-{Guid.NewGuid()}@test.com";
        var email2 = $"notif-own2-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email1, "Teste1234!");
        await CreateAndConfirmUserAsync(email2, "Teste1234!");
        var token1 = await LoginAndGetTokenAsync(email1, "Teste1234!");
        var userId1 = await GetUserIdAsync(email1);
        var userId2 = await GetUserIdAsync(email2);

        // Inserir notificações diretamente na BD
        await InsertNotificationAsync(userId1, "User1 Title", "User1 Message", NotificationType.DocumentInvite);
        await InsertNotificationAsync(userId2, "User2 Title", "User2 Message", NotificationType.TeamInvite);

        var authClient = CreateAuthenticatedClient(token1);

        // Act
        var response = await authClient.GetAsync("/api/notifications");

        // Assert
        response.EnsureSuccessStatusCode();
        var notifications = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
        Assert.NotNull(notifications);
        Assert.All(notifications!, n => Assert.Equal("User1 Title", n.Title));
        Assert.DoesNotContain(notifications!, n => n.Title == "User2 Title");
    }

    [Fact]
    public async Task GetNotifications_UnreadOnly_FiltersCorrectly()
    {
        // Arrange
        var email = $"notif-unread-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        // Inserir uma lida e uma não lida
        await InsertNotificationAsync(userId, "Read", "Read msg", NotificationType.DocumentInvite, isRead: true);
        await InsertNotificationAsync(userId, "Unread", "Unread msg", NotificationType.TeamInvite, isRead: false);

        // Act
        var response = await authClient.GetAsync("/api/notifications?unreadOnly=true");

        // Assert
        response.EnsureSuccessStatusCode();
        var notifications = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
        Assert.NotNull(notifications);
        Assert.All(notifications!, n => Assert.False(n.IsRead));
    }

    [Fact]
    public async Task GetNotifications_Pagination_RespectsPageSize()
    {
        // Arrange
        var email = $"notif-page-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        // Inserir 5 notificações
        for (int i = 0; i < 5; i++)
        {
            await InsertNotificationAsync(userId, $"Page {i}", $"Msg {i}", NotificationType.DocumentInvite);
        }

        // Act - pedir apenas 2 por página
        var response = await authClient.GetAsync("/api/notifications?page=1&pageSize=2");

        // Assert
        response.EnsureSuccessStatusCode();
        var notifications = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
        Assert.NotNull(notifications);
        Assert.Equal(2, notifications!.Count);
    }

    [Fact]
    public async Task GetNotifications_OrderedByCreatedAtDescending()
    {
        // Arrange
        var email = $"notif-order-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        // Inserir com datas diferentes
        await InsertNotificationAsync(userId, "Old", "Old msg", NotificationType.DocumentInvite,
            createdAt: DateTime.UtcNow.AddHours(-2));
        await InsertNotificationAsync(userId, "New", "New msg", NotificationType.TeamInvite,
            createdAt: DateTime.UtcNow);

        // Act
        var response = await authClient.GetAsync("/api/notifications");

        // Assert
        response.EnsureSuccessStatusCode();
        var notifications = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
        Assert.NotNull(notifications);
        Assert.True(notifications!.Count >= 2);
        // A mais recente deve vir primeiro
        var newIdx = notifications.FindIndex(n => n.Title == "New");
        var oldIdx = notifications.FindIndex(n => n.Title == "Old");
        Assert.True(newIdx < oldIdx, "Notifications should be ordered by CreatedAt descending");
    }

    // ==================== MARK AS READ ====================

    [Fact]
    public async Task MarkAsRead_ValidNotification_ReturnsNoContent()
    {
        // Arrange
        var email = $"notif-read-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        var notifId = await InsertNotificationAsync(userId, "To Read", "Msg", NotificationType.DocumentInvite);

        // Act
        var response = await authClient.PatchAsync($"/api/notifications/{notifId}/read", null);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verificar na BD
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var notif = await db.Notifications.FindAsync(notifId);
        Assert.NotNull(notif);
        Assert.True(notif!.IsRead);
    }

    [Fact]
    public async Task MarkAsRead_NotificationNotFound_ReturnsNotFound()
    {
        // Arrange
        var email = $"notif-read404-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var authClient = CreateAuthenticatedClient(token);

        // Act
        var response = await authClient.PatchAsync("/api/notifications/999999/read", null);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task MarkAsRead_OtherUsersNotification_ReturnsNotFound()
    {
        // Arrange - User1 cria notificação, User2 tenta marcar como lida
        var email1 = $"notif-readother1-{Guid.NewGuid()}@test.com";
        var email2 = $"notif-readother2-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email1, "Teste1234!");
        await CreateAndConfirmUserAsync(email2, "Teste1234!");
        var token2 = await LoginAndGetTokenAsync(email2, "Teste1234!");
        var userId1 = await GetUserIdAsync(email1);

        var notifId = await InsertNotificationAsync(userId1, "Not Yours", "Msg", NotificationType.DocumentInvite);

        var authClient2 = CreateAuthenticatedClient(token2);

        // Act
        var response = await authClient2.PatchAsync($"/api/notifications/{notifId}/read", null);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ==================== MARK ALL AS READ ====================

    [Fact]
    public async Task MarkAllAsRead_MarksAllUnreadNotifications()
    {
        // Arrange
        var email = $"notif-readall-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        await InsertNotificationAsync(userId, "Unread1", "Msg", NotificationType.DocumentInvite);
        await InsertNotificationAsync(userId, "Unread2", "Msg", NotificationType.TeamInvite);

        // Act
        var response = await authClient.PatchAsync("/api/notifications/read-all", null);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verificar que todas ficaram lidas
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var unread = await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync();
        Assert.Equal(0, unread);
    }

    // ==================== DELETE NOTIFICATION ====================

    [Fact]
    public async Task DeleteNotification_ValidNotification_ReturnsNoContent()
    {
        // Arrange
        var email = $"notif-del-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        var notifId = await InsertNotificationAsync(userId, "To Delete", "Msg", NotificationType.DocumentInvite);

        // Act
        var response = await authClient.DeleteAsync($"/api/notifications/{notifId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verificar que foi removida da BD
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var notif = await db.Notifications.FindAsync(notifId);
        Assert.Null(notif);
    }

    [Fact]
    public async Task DeleteNotification_NotFound_ReturnsNotFound()
    {
        // Arrange
        var email = $"notif-del404-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var authClient = CreateAuthenticatedClient(token);

        // Act
        var response = await authClient.DeleteAsync("/api/notifications/999999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteNotification_OtherUsersNotification_ReturnsNotFound()
    {
        // Arrange
        var email1 = $"notif-delother1-{Guid.NewGuid()}@test.com";
        var email2 = $"notif-delother2-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email1, "Teste1234!");
        await CreateAndConfirmUserAsync(email2, "Teste1234!");
        var token2 = await LoginAndGetTokenAsync(email2, "Teste1234!");
        var userId1 = await GetUserIdAsync(email1);

        var notifId = await InsertNotificationAsync(userId1, "Not Yours", "Msg", NotificationType.DocumentInvite);

        var authClient2 = CreateAuthenticatedClient(token2);

        // Act
        var response = await authClient2.DeleteAsync($"/api/notifications/{notifId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ==================== DELETE ALL NOTIFICATIONS ====================

    [Fact]
    public async Task DeleteAllNotifications_RemovesAllUserNotifications()
    {
        // Arrange
        var email = $"notif-delall-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        await InsertNotificationAsync(userId, "Del1", "Msg", NotificationType.DocumentInvite);
        await InsertNotificationAsync(userId, "Del2", "Msg", NotificationType.TeamInvite);

        // Act
        var response = await authClient.DeleteAsync("/api/notifications/all");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verificar que todas foram removidas
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var count = await db.Notifications.CountAsync(n => n.UserId == userId);
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task DeleteAllNotifications_DoesNotAffectOtherUsers()
    {
        // Arrange
        var email1 = $"notif-delall1-{Guid.NewGuid()}@test.com";
        var email2 = $"notif-delall2-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email1, "Teste1234!");
        await CreateAndConfirmUserAsync(email2, "Teste1234!");
        var token1 = await LoginAndGetTokenAsync(email1, "Teste1234!");
        var userId1 = await GetUserIdAsync(email1);
        var userId2 = await GetUserIdAsync(email2);

        await InsertNotificationAsync(userId1, "User1", "Msg", NotificationType.DocumentInvite);
        await InsertNotificationAsync(userId2, "User2", "Msg", NotificationType.TeamInvite);

        var authClient1 = CreateAuthenticatedClient(token1);

        // Act - User1 apaga todas as suas
        await authClient1.DeleteAsync("/api/notifications/all");

        // Assert - notificação do User2 continua
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var user2Count = await db.Notifications.CountAsync(n => n.UserId == userId2);
        Assert.True(user2Count >= 1);
    }

    // ==================== PREFERENCES ====================

    [Fact]
    public async Task GetPreferences_ReturnsDefaults()
    {
        // Arrange
        var email = $"notif-pref-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var authClient = CreateAuthenticatedClient(token);

        // Act
        var response = await authClient.GetAsync("/api/notifications/preferences");

        // Assert
        response.EnsureSuccessStatusCode();
        var prefs = await response.Content.ReadFromJsonAsync<NotificationPreferenceDto>();
        Assert.NotNull(prefs);
        Assert.True(prefs!.EmailEnabled);
        Assert.True(prefs.InAppEnabled);
        Assert.Equal("en", prefs.Language);
    }

    [Fact]
    public async Task GetPreferences_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/notifications/preferences");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdatePreferences_ChangesValues()
    {
        // Arrange
        var email = $"notif-prefup-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var authClient = CreateAuthenticatedClient(token);

        var updateDto = new UpdateNotificationPreferenceDto
        {
            EmailEnabled = false,
            InAppEnabled = false,
            Language = "pt"
        };

        // Act
        var response = await authClient.PutAsJsonAsync("/api/notifications/preferences", updateDto);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verificar que as preferências foram atualizadas
        var getResponse = await authClient.GetAsync("/api/notifications/preferences");
        var prefs = await getResponse.Content.ReadFromJsonAsync<NotificationPreferenceDto>();
        Assert.NotNull(prefs);
        Assert.False(prefs!.EmailEnabled);
        Assert.False(prefs.InAppEnabled);
        Assert.Equal("pt", prefs.Language);
    }

    [Fact]
    public async Task UpdatePreferences_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        var updateDto = new UpdateNotificationPreferenceDto
        {
            EmailEnabled = true,
            InAppEnabled = true,
            Language = "en"
        };

        // Act
        var response = await _client.PutAsJsonAsync("/api/notifications/preferences", updateDto);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ==================== NOTIFICATION WITH ACTOR ====================

    [Fact]
    public async Task GetNotifications_IncludesActorName()
    {
        // Arrange
        var actorEmail = $"notif-actor-{Guid.NewGuid()}@test.com";
        var recipientEmail = $"notif-recip-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(actorEmail, "Teste1234!");
        await CreateAndConfirmUserAsync(recipientEmail, "Teste1234!");
        var recipientToken = await LoginAndGetTokenAsync(recipientEmail, "Teste1234!");
        var actorId = await GetUserIdAsync(actorEmail);
        var recipientId = await GetUserIdAsync(recipientEmail);

        // Inserir notificação com actor
        await InsertNotificationAsync(recipientId, "Invite", "You were invited", NotificationType.DocumentInvite,
            actorId: actorId);

        var authClient = CreateAuthenticatedClient(recipientToken);

        // Act
        var response = await authClient.GetAsync("/api/notifications");

        // Assert
        response.EnsureSuccessStatusCode();
        var notifications = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
        Assert.NotNull(notifications);
        var notif = notifications!.FirstOrDefault(n => n.Title == "Invite");
        Assert.NotNull(notif);
        Assert.Equal(actorId, notif!.ActorId);
        Assert.NotNull(notif.ActorName);
    }

    // ==================== NOTIFICATION DTO FIELDS ====================

    [Fact]
    public async Task GetNotifications_ReturnsAllDtoFields()
    {
        // Arrange
        var email = $"notif-fields-{Guid.NewGuid()}@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");
        var token = await LoginAndGetTokenAsync(email, "Teste1234!");
        var userId = await GetUserIdAsync(email);
        var authClient = CreateAuthenticatedClient(token);

        await InsertNotificationAsync(userId, "Title EN", "Message EN", NotificationType.CommentMention,
            titlePt: "Título PT", messagePt: "Mensagem PT", referenceId: 42, referenceType: "Document",
            referenceToken: "test-token-123");

        // Act
        var response = await authClient.GetAsync("/api/notifications");

        // Assert
        response.EnsureSuccessStatusCode();
        var notifications = await response.Content.ReadFromJsonAsync<List<NotificationDto>>();
        var notif = notifications!.FirstOrDefault(n => n.Title == "Title EN");
        Assert.NotNull(notif);
        Assert.Equal("Title EN", notif!.Title);
        Assert.Equal("Título PT", notif.TitlePt);
        Assert.Equal("Message EN", notif.Message);
        Assert.Equal("Mensagem PT", notif.MessagePt);
        Assert.Equal((int)NotificationType.CommentMention, notif.Type);
        Assert.False(notif.IsRead);
        Assert.Equal(42, notif.ReferenceId);
        Assert.Equal("Document", notif.ReferenceType);
        Assert.Equal("test-token-123", notif.ReferenceToken);
        Assert.NotNull(notif.CreatedAt);
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

    /// <summary>
    /// Insere uma notificação diretamente na BD para testes.
    /// </summary>
    private async Task<int> InsertNotificationAsync(
        string userId,
        string title,
        string message,
        NotificationType type,
        bool isRead = false,
        string? actorId = null,
        string? titlePt = null,
        string? messagePt = null,
        int? referenceId = null,
        string? referenceType = null,
        string? referenceToken = null,
        DateTime? createdAt = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            IsRead = isRead,
            ActorId = actorId,
            TitlePt = titlePt,
            MessagePt = messagePt,
            ReferenceId = referenceId,
            ReferenceType = referenceType,
            ReferenceToken = referenceToken,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        return notification.Id;
    }
}
