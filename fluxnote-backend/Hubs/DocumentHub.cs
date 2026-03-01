using System.Collections.Concurrent;
using System.Security.Claims;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Fluxnote.Backend.Hubs
{
    /// <summary>
    /// Hub SignalR para colaboração em tempo real nos documentos.
    /// Cada documento tem o seu próprio grupo: "doc-{documentId}".
    ///
    /// Fluxo:
    ///   1. Cliente chama JoinDocument(documentId)
    ///   2. Hub valida permissão e adiciona ao grupo
    ///   3. Edições locais → SendUpdate(documentId, update[])
    ///   4. Hub faz relay para todos os outros no grupo via ReceiveUpdate
    ///   5. Periodicamente o cliente chama SaveSnapshot para persistir
    ///   6. Na desconexão, Hub notifica o grupo
    /// </summary>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DocumentHub : Hub
    {
        private readonly FluxnoteServerContext _db;
        private readonly ILogger<DocumentHub> _logger;

        // Rastreia connectionId → documentId para cleanup na desconexão
        private static readonly ConcurrentDictionary<string, int> _connectionDocuments = new();

        public DocumentHub(FluxnoteServerContext db, ILogger<DocumentHub> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────
        // Entrar num documento
        // ─────────────────────────────────────────────────────────

        public async Task JoinDocument(int documentId)
        {
            var userId = GetUserId();

            var hasAccess = await HasDocumentAccess(userId, documentId);
            if (!hasAccess)
                throw new HubException("Sem permissão para aceder a este documento.");

            var group = GroupName(documentId);
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
            _connectionDocuments[Context.ConnectionId] = documentId;

            _logger.LogInformation(
                "Utilizador {UserId} entrou no documento {DocumentId}", userId, documentId);

            // Notificar os outros membros do grupo
            await Clients.OthersInGroup(group).SendAsync("UserJoined", userId);
        }

        // ─────────────────────────────────────────────────────────
        // Sair de um documento
        // ─────────────────────────────────────────────────────────

        public async Task LeaveDocument(int documentId)
        {
            var group = GroupName(documentId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
            _connectionDocuments.TryRemove(Context.ConnectionId, out _);

            await Clients.OthersInGroup(group).SendAsync("UserLeft", GetUserId());
        }

        // ─────────────────────────────────────────────────────────
        // Relay de update Yjs binário para os outros clientes
        // ─────────────────────────────────────────────────────────

        public async Task SendUpdate(int documentId, byte[] update)
        {
            // Não enviar de volta para quem enviou (OthersInGroup)
            await Clients.OthersInGroup(GroupName(documentId))
                .SendAsync("ReceiveUpdate", update);
        }

        // ─────────────────────────────────────────────────────────
        // Relay de estado de awareness (posição de cursor, nome do utilizador)
        // ─────────────────────────────────────────────────────────

        public async Task SendAwareness(int documentId, string stateJson)
        {
            await Clients.OthersInGroup(GroupName(documentId))
                .SendAsync("ReceiveAwareness", Context.ConnectionId, stateJson);
        }

        // ─────────────────────────────────────────────────────────
        // Guardar snapshot completo do Y.Doc na BD
        // Chamado periodicamente pelo cliente (a cada 30 segundos)
        // ─────────────────────────────────────────────────────────

        public async Task SaveSnapshot(int documentId, byte[] snapshot)
        {
            var userId = GetUserId();

            var hasWrite = await HasWriteAccess(userId, documentId);
            if (!hasWrite) return;

            var doc = await _db.Document.FindAsync(documentId);
            if (doc is null || doc.IsDeleted) return;

            doc.YDocSnapshot = snapshot;
            doc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogDebug(
                "Snapshot do documento {DocumentId} guardado ({Bytes} bytes)",
                documentId, snapshot.Length);
        }

        // ─────────────────────────────────────────────────────────
        // Cleanup na desconexão (timeout, fechar tab, etc.)
        // ─────────────────────────────────────────────────────────

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_connectionDocuments.TryRemove(Context.ConnectionId, out var documentId))
            {
                var group = GroupName(documentId);
                await Clients.Group(group).SendAsync("UserLeft", GetUserId());
                _logger.LogInformation(
                    "Conexão {ConnectionId} desconectada do documento {DocumentId}",
                    Context.ConnectionId, documentId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ─────────────────────────────────────────────────────────
        // Helpers privados
        // ─────────────────────────────────────────────────────────

        private string GetUserId()
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                throw new HubException("Não autenticado.");
            return userId;
        }

        private static string GroupName(int documentId) => $"doc-{documentId}";

        private async Task<bool> HasDocumentAccess(string userId, int documentId)
        {
            var doc = await _db.Document
                .Include(d => d.Team)
                    .ThenInclude(t => t.Members)
                .Include(d => d.Permissions)
                    .ThenInclude(p => p.TeamMember)
                .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);

            if (doc is null) return false;

            var member = doc.Team.Members.FirstOrDefault(m => m.UserId == userId);
            if (member is null) return false;

            // Owner e TeamAdmin têm acesso implícito
            if (member.Role >= TeamRole.TeamAdmin) return true;

            // Membro regular precisa de permissão explícita
            return doc.Permissions.Any(p => p.TeamMember.UserId == userId);
        }

        private async Task<bool> HasWriteAccess(string userId, int documentId)
        {
            var doc = await _db.Document
                .Include(d => d.Team)
                    .ThenInclude(t => t.Members)
                .Include(d => d.Permissions)
                    .ThenInclude(p => p.TeamMember)
                .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);

            if (doc is null) return false;

            var member = doc.Team.Members.FirstOrDefault(m => m.UserId == userId);
            if (member is null) return false;

            if (member.Role >= TeamRole.TeamAdmin) return true;

            return doc.Permissions.Any(p =>
                p.TeamMember.UserId == userId &&
                p.Role == DocumentRole.Editor);
        }
    }
}