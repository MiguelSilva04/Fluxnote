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
    ///   6. Na desconexão, se houve edições, cria uma DocumentVersion
    /// </summary>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DocumentHub : Hub
    {
        private readonly FluxnoteServerContext _db;
        private readonly ILogger<DocumentHub> _logger;

        // connectionId → documentId para cleanup na desconexão
        private static readonly ConcurrentDictionary<string, int> _connectionDocuments = new();

        // connectionId → userId (para usar no OnDisconnectedAsync onde Context.User pode ser null)
        private static readonly ConcurrentDictionary<string, string> _connectionUsers = new();

        // Marca conexões que fizeram pelo menos uma edição (SendUpdate ou SaveSnapshot)
        private static readonly ConcurrentDictionary<string, bool> _connectionEdited = new();

        // Timer de 1 hora por conexão: garante que sessões longas guardam versão a cada hora
        private static readonly ConcurrentDictionary<string, CancellationTokenSource> _connectionTimers = new();

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
            _connectionUsers[Context.ConnectionId] = userId;

            _logger.LogInformation(
                "Utilizador {UserId} entrou no documento {DocumentId}", userId, documentId);

            await Clients.OthersInGroup(group).SendAsync("UserJoined", userId);

            // Iniciar timer de 1 hora: se a sessão ficar aberta, guarda versão a cada hora
            StartSessionTimer(Context.ConnectionId, userId, documentId);
        }

        // ─────────────────────────────────────────────────────────
        // Sair de um documento
        // ─────────────────────────────────────────────────────────

        public async Task LeaveDocument(int documentId, string? htmlContent = null)
        {
            var connId = Context.ConnectionId;
            var userId = GetUserId();

            // Cancelar o timer de 1 hora antes de criar versão (evita duplicados)
            CancelSessionTimer(connId);

            // Criar versão se houve edições nesta sessão
            if (_connectionEdited.TryRemove(connId, out _))
                await CreateVersionAsync(userId, documentId, htmlContent);

            var group = GroupName(documentId);
            await Groups.RemoveFromGroupAsync(connId, group);
            _connectionDocuments.TryRemove(connId, out _);
            _connectionUsers.TryRemove(connId, out _);

            await Clients.OthersInGroup(group).SendAsync("UserLeft", userId);
        }

        // ─────────────────────────────────────────────────────────
        // Relay de update Yjs binário para os outros clientes
        // ─────────────────────────────────────────────────────────

        public async Task SendUpdate(int documentId, byte[] update)
        {
            // Marcar esta conexão como tendo feito edições
            _connectionEdited[Context.ConnectionId] = true;

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

        public async Task SaveSnapshot(int documentId, byte[] snapshot, string? htmlContent = null)
        {
            var userId = GetUserId();

            var hasWrite = await HasWriteAccess(userId, documentId);
            if (!hasWrite) return;

            var doc = await _db.Document.FindAsync(documentId);
            if (doc is null || doc.IsDeleted) return;

            doc.YDocSnapshot = snapshot;

            // Guardar também o HTML actual para que doc.Content fique sempre actualizado.
            // Assim, em caso de desconexão abrupta, OnDisconnectedAsync usa conteúdo recente.
            if (!string.IsNullOrEmpty(htmlContent))
                doc.Content = System.Text.Encoding.UTF8.GetBytes(htmlContent);

            doc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Nota: NÃO marcar _connectionEdited aqui.
            // SaveSnapshot é chamado periodicamente mesmo sem edições.
            // Só SendUpdate (deltas Yjs reais) deve marcar a sessão como editada.

            _logger.LogDebug(
                "Snapshot do documento {DocumentId} guardado ({Bytes} bytes)",
                documentId, snapshot.Length);
        }

        // ─────────────────────────────────────────────────────────
        // Cleanup na desconexão (timeout, fechar tab, etc.)
        // ─────────────────────────────────────────────────────────

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connId = Context.ConnectionId;

            if (_connectionDocuments.TryRemove(connId, out var documentId))
            {
                _connectionUsers.TryGetValue(connId, out var userId);

                // Cancelar o timer de 1 hora antes de criar versão (evita duplicados)
                CancelSessionTimer(connId);

                // Criar versão se houve edições nesta sessão
                if (_connectionEdited.TryRemove(connId, out _) && userId is not null)
                    await CreateVersionAsync(userId, documentId);

                _connectionUsers.TryRemove(connId, out _);

                var group = GroupName(documentId);
                var userIdForNotify = userId ?? "unknown";
                await Clients.Group(group).SendAsync("UserLeft", userIdForNotify);

                _logger.LogInformation(
                    "Conexão {ConnectionId} desconectada do documento {DocumentId}",
                    connId, documentId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ─────────────────────────────────────────────────────────
        // Timer de sessão: cria versão a cada hora se houver edições
        // ─────────────────────────────────────────────────────────

        private void StartSessionTimer(string connId, string userId, int documentId)
        {
            CancelSessionTimer(connId);

            var cts = new CancellationTokenSource();
            _connectionTimers[connId] = cts;

            _ = Task.Run(async () =>
            {
                try
                {
                    while (!cts.Token.IsCancellationRequested && _connectionDocuments.ContainsKey(connId))
                    {
                        await Task.Delay(TimeSpan.FromHours(1), cts.Token);

                        // Verificar se a conexão ainda está ativa após 1 hora
                        if (!_connectionDocuments.ContainsKey(connId)) break;

                        // Criar versão se houve edições nesta hora
                        if (_connectionEdited.TryRemove(connId, out _))
                        {
                            _logger.LogInformation(
                                "Sessão longa detectada para documento {DocumentId} — a criar versão após 1 hora",
                                documentId);
                            await CreateVersionAsync(userId, documentId);
                        }
                        // Continuar o loop para a próxima hora
                    }
                }
                catch (OperationCanceledException) { /* desconexão normal */ }
            });
        }

        private static void CancelSessionTimer(string connId)
        {
            if (_connectionTimers.TryRemove(connId, out var cts))
            {
                cts.Cancel();
                cts.Dispose();
            }
        }

        // ─────────────────────────────────────────────────────────
        // Criar versão do documento ao fechar sessão
        // ─────────────────────────────────────────────────────────

        private async Task CreateVersionAsync(string userId, int documentId, string? htmlContent = null)
        {
            try
            {
                var doc = await _db.Document
                    .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);

                if (doc?.YDocSnapshot == null) return;

                var user = await _db.Users.FindAsync(userId);
                var authorName = user?.FullName ?? user?.UserName ?? user?.Email ?? "Unknown";

                // Usar o HTML enviado pelo cliente (conteúdo actual no momento do fecho),
                // com fallback para doc.Content caso não seja fornecido (ex: desconexão abrupta)
                byte[]? contentBytes = htmlContent != null
                    ? System.Text.Encoding.UTF8.GetBytes(htmlContent)
                    : doc.Content;

                var version = new DocumentVersion
                {
                    DocumentId = documentId,
                    AuthorId = userId,
                    AuthorName = authorName,
                    CreatedAt = DateTime.UtcNow,
                    Summary = $"Session by {authorName}",
                    YDocSnapshot = doc.YDocSnapshot,
                    ContentHtml = contentBytes
                };

                _db.DocumentVersion.Add(version);
                await _db.SaveChangesAsync();

                _logger.LogInformation(
                    "Versão criada para documento {DocumentId} por utilizador {UserId}",
                    documentId, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Erro ao criar versão para documento {DocumentId}", documentId);
            }
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

            if (member.Role >= TeamRole.TeamAdmin) return true;

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
