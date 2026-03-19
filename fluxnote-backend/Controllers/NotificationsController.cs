using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Notifications;
using Fluxnote.Backend.Services.Notifications;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers;

/// <summary>
/// Controlador para gestão de notificações in-app e preferências de notificação.
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class NotificationsController : ControllerBase
{
    private readonly FluxnoteServerContext _context;
    private readonly INotificationService _notificationService;

    public NotificationsController(FluxnoteServerContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    /// <summary>
    /// Lista as notificações do utilizador autenticado (ordenadas por data, mais recentes primeiro).
    /// Suporte para paginação mas o frontend ainda não utiliza
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationDto>>> GetNotifications(
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized(new { message = "User not authenticated." });

        var query = _context.Notifications
            .Where(n => n.UserId == userId);

        if (unreadOnly == true)
            query = query.Where(n => !n.IsRead);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(n => n.Actor)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = (int)n.Type,
                Title = n.Title,
                TitlePt = n.TitlePt,
                Message = n.Message,
                MessagePt = n.MessagePt,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt.ToString("o"),
                ReferenceId = n.ReferenceId,
                ReferenceType = n.ReferenceType,
                ActorId = n.ActorId,
                ActorName = n.Actor != null ? (n.Actor.FullName ?? n.Actor.Email) : null,
                ReferenceToken = n.ReferenceToken
            })
            .ToListAsync();

        return Ok(notifications);
    }

    /// <summary>
    /// Marca uma notificação como lida.
    /// </summary>
    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized(new { message = "User not authenticated." });

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
            return NotFound(new { message = "Notification not found." });

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Marca todas as notificações do utilizador como lidas.
    /// </summary>
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized(new { message = "User not authenticated." });

        await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return NoContent();
    }

    /// <summary>
    /// Obtém as preferências de notificação do utilizador.
    /// </summary>
    [HttpGet("preferences")]
    public async Task<ActionResult<NotificationPreferenceDto>> GetPreferences()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized(new { message = "User not authenticated." });

        var preferences = await _notificationService.GetOrCreatePreferencesAsync(userId);

        return Ok(new NotificationPreferenceDto
        {
            EmailEnabled = preferences.EmailEnabled,
            InAppEnabled = preferences.InAppEnabled,
            Language = preferences.Language
        });
    }

    /// <summary>
    /// Atualiza as preferências de notificação do utilizador.
    /// </summary>
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdateNotificationPreferenceDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized(new { message = "User not authenticated." });

        var preferences = await _notificationService.GetOrCreatePreferencesAsync(userId);
        preferences.EmailEnabled = dto.EmailEnabled;
        preferences.InAppEnabled = dto.InAppEnabled;
        preferences.Language = dto.Language;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Elimina todas as notificações do utilizador.
    /// </summary>
    [HttpDelete("all")]
    public async Task<IActionResult> DeleteAllNotifications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized(new { message = "User not authenticated." });

        await _context.Notifications
            .Where(n => n.UserId == userId)
            .ExecuteDeleteAsync();

        return NoContent();
    }

    /// <summary>
    /// Elimina uma notificação.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized(new { message = "User not authenticated." });

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
            return NotFound(new { message = "Notification not found." });

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
