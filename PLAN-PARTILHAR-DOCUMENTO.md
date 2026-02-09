# Plano: Partilhar Documento via Link de Convite

## Contexto

Implementar sistema de convites por link para que Owner/TeamAdmin possam partilhar documentos com outras pessoas. Quem aceita o convite entra na equipa como Member e recebe um `DocumentPermission` com a `DocumentRole` definida pelo criador do convite.

**Sem email sender**: o link é copiado manualmente (botao "Copiar Link") e partilhado por qualquer canal (WhatsApp, Discord, email pessoal, etc.).

---

## Passo 1 — Modelo `DocumentInvite` (Backend)

### 1.1 Criar ficheiro `fluxnote-backend/Models/DocumentInvite.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

public class DocumentInvite
{
    public int Id { get; set; }

    // Token unico para o link de convite
    [Required]
    public string Token { get; set; } = string.Empty;

    // Foreign Keys
    [Required]
    public int DocumentId { get; set; }
    [Required]
    public int CreatedByTeamMemberId { get; set; }

    // Role a atribuir ao convidado
    public DocumentRole Role { get; set; } = DocumentRole.Viewer;

    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; } = false;

    // Tracking de uso (null = nao usado)
    public string? UsedByUserId { get; set; }

    // Navigation properties
    public Document Document { get; set; } = null!;
    public TeamMember CreatedBy { get; set; } = null!;
}
```

### 1.2 Adicionar DbSet ao `fluxnote-backend/Data/FluxnoteServerContext.cs`

Adicionar esta linha junto dos outros DbSets (depois da linha `public DbSet<Fluxnote.Backend.Models.DocumentPermission> DocumentPermission ...`):

```csharp
public DbSet<Fluxnote.Backend.Models.DocumentInvite> DocumentInvite { get; set; } = default!;
```

### 1.3 Adicionar configuracao Fluent API no `OnModelCreating` do mesmo ficheiro

Adicionar este bloco **antes** do `if (Database.IsSqlServer())` (depois do bloco `builder.Entity<DocumentPermission>(...)`):

```csharp
builder.Entity<DocumentInvite>(entity =>
{
    // Index unico no Token
    entity.HasIndex(di => di.Token).IsUnique();

    // Relacao com Document (cascade delete - se documento for apagado, convites tambem)
    entity.HasOne(di => di.Document)
          .WithMany()
          .HasForeignKey(di => di.DocumentId)
          .OnDelete(DeleteBehavior.Cascade);

    // Relacao com TeamMember (restrict delete - nao apagar convite se membro for removido)
    entity.HasOne(di => di.CreatedBy)
          .WithMany()
          .HasForeignKey(di => di.CreatedByTeamMemberId)
          .OnDelete(DeleteBehavior.Restrict);

    // Indices para performance
    entity.HasIndex(di => di.DocumentId);
    entity.HasIndex(di => di.ExpiresAt);
});
```

### 1.4 Criar migracao

Executar na pasta `fluxnote-backend/`:

```bash
dotnet ef migrations add AddDocumentInvite
dotnet ef database update
```

---

## Passo 2 — DTOs do Convite (Backend)

### 2.1 Criar pasta `fluxnote-backend/Dtos/DocumentInvites/`

### 2.2 Criar ficheiro `fluxnote-backend/Dtos/DocumentInvites/CreateDocumentInviteRequest.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.DocumentInvites
{
    public class CreateDocumentInviteRequest
    {
        [Required]
        public int DocumentId { get; set; }

        [Required]
        public int Role { get; set; } // 0 = Viewer, 1 = Editor

        public int ExpirationDays { get; set; } = 7; // Default 7 dias
    }
}
```

### 2.3 Criar ficheiro `fluxnote-backend/Dtos/DocumentInvites/DocumentInviteDto.cs`

```csharp
namespace Fluxnote.Backend.Dtos.DocumentInvites
{
    public class DocumentInviteDto
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public int DocumentId { get; set; }
        public string DocumentTitle { get; set; } = string.Empty;
        public int TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;
        public int Role { get; set; } // 0=Viewer, 1=Editor
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; }
        public bool IsUsed { get; set; }
        public string InviteUrl { get; set; } = string.Empty;
    }
}
```

### 2.4 Criar ficheiro `fluxnote-backend/Dtos/DocumentInvites/AcceptInviteResponseDto.cs`

```csharp
namespace Fluxnote.Backend.Dtos.DocumentInvites
{
    public class AcceptInviteResponseDto
    {
        public int TeamId { get; set; }
        public int DocumentId { get; set; }
        public string DocumentTitle { get; set; } = string.Empty;
        public string TeamName { get; set; } = string.Empty;
        public int DocumentRole { get; set; } // 0=Viewer, 1=Editor
    }
}
```

---

## Passo 3 — Controller `DocumentInvitesController` (Backend)

### 3.1 Criar ficheiro `fluxnote-backend/Controllers/DocumentInvitesController.cs`

```csharp
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.DocumentInvites;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers
{
    [Route("api/document-invites")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DocumentInvitesController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;

        public DocumentInvitesController(
            FluxnoteServerContext context,
            UserManager<User> userManager,
            IConfiguration configuration)
        {
            _context = context;
            _userManager = userManager;
            _configuration = configuration;
        }

        /// <summary>
        /// Cria um convite por link para um documento.
        /// Apenas Owner ou TeamAdmin podem criar convites.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<DocumentInviteDto>> CreateInvite([FromBody] CreateDocumentInviteRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Validar DocumentRole
            if (request.Role != (int)DocumentRole.Viewer && request.Role != (int)DocumentRole.Editor)
            {
                return BadRequest(new
                {
                    message = "Invalid role.",
                    errors = new[] { "Document role must be Viewer (0) or Editor (1)." }
                });
            }

            // Validar ExpirationDays
            if (request.ExpirationDays < 1 || request.ExpirationDays > 30)
            {
                return BadRequest(new
                {
                    message = "Invalid expiration.",
                    errors = new[] { "Expiration must be between 1 and 30 days." }
                });
            }

            // Verificar que o documento existe
            var document = await _context.Document
                .Include(d => d.Team)
                .FirstOrDefaultAsync(d => d.Id == request.DocumentId && !d.IsDeleted);

            if (document == null)
                return NotFound(new { message = "Document not found." });

            // Verificar que o caller e Owner ou TeamAdmin da equipa
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (callerMember == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            if (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can create document invites." }
                });
            }

            // Gerar token unico
            var token = Guid.NewGuid().ToString();

            var invite = new DocumentInvite
            {
                Token = token,
                DocumentId = request.DocumentId,
                CreatedByTeamMemberId = callerMember.Id,
                Role = (DocumentRole)request.Role,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(request.ExpirationDays),
                IsRevoked = false,
                UsedByUserId = null
            };

            _context.DocumentInvite.Add(invite);
            await _context.SaveChangesAsync();

            var frontendUrl = _configuration["Frontend:Url"] ?? "http://localhost:4200";

            var dto = new DocumentInviteDto
            {
                Id = invite.Id,
                Token = invite.Token,
                DocumentId = invite.DocumentId,
                DocumentTitle = document.Title,
                TeamId = document.TeamId,
                TeamName = document.Team.Name,
                CreatedByName = callerMember.Name,
                Role = (int)invite.Role,
                ExpiresAt = invite.ExpiresAt,
                IsRevoked = invite.IsRevoked,
                IsUsed = invite.UsedByUserId != null,
                InviteUrl = $"{frontendUrl}/invite/{invite.Token}"
            };

            return CreatedAtAction(nameof(GetInviteInfo), new { token = invite.Token }, dto);
        }

        /// <summary>
        /// Lista convites ativos de um documento.
        /// Apenas Owner ou TeamAdmin podem ver.
        /// </summary>
        [HttpGet("by-document/{documentId}")]
        public async Task<ActionResult<IEnumerable<DocumentInviteDto>>> GetByDocument(int documentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .Include(d => d.Team)
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (document == null)
                return NotFound(new { message = "Document not found." });

            // Verificar que o caller e Owner ou TeamAdmin
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (callerMember == null || (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can view document invites." }
                });
            }

            var frontendUrl = _configuration["Frontend:Url"] ?? "http://localhost:4200";

            var invites = await _context.DocumentInvite
                .Include(di => di.CreatedBy)
                .Include(di => di.Document)
                    .ThenInclude(d => d.Team)
                .Where(di => di.DocumentId == documentId && !di.IsRevoked && di.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(di => di.CreatedAt)
                .Select(di => new DocumentInviteDto
                {
                    Id = di.Id,
                    Token = di.Token,
                    DocumentId = di.DocumentId,
                    DocumentTitle = di.Document.Title,
                    TeamId = di.Document.TeamId,
                    TeamName = di.Document.Team.Name,
                    CreatedByName = di.CreatedBy.Name,
                    Role = (int)di.Role,
                    ExpiresAt = di.ExpiresAt,
                    IsRevoked = di.IsRevoked,
                    IsUsed = di.UsedByUserId != null,
                    InviteUrl = $"{frontendUrl}/invite/{di.Token}"
                })
                .ToListAsync();

            return Ok(invites);
        }

        /// <summary>
        /// Obtem informacao publica de um convite (preview antes de aceitar).
        /// Requer autenticacao mas nao precisa ser membro da equipa.
        /// </summary>
        [HttpGet("{token}/info")]
        public async Task<ActionResult<DocumentInviteDto>> GetInviteInfo(string token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var invite = await _context.DocumentInvite
                .Include(di => di.Document)
                    .ThenInclude(d => d.Team)
                .Include(di => di.CreatedBy)
                .FirstOrDefaultAsync(di => di.Token == token);

            if (invite == null)
                return NotFound(new { message = "Invite not found." });

            if (invite.IsRevoked)
            {
                return BadRequest(new
                {
                    message = "Invite revoked.",
                    errors = new[] { "This invite has been revoked." }
                });
            }

            if (invite.ExpiresAt <= DateTime.UtcNow)
            {
                return BadRequest(new
                {
                    message = "Invite expired.",
                    errors = new[] { "This invite has expired." }
                });
            }

            if (invite.UsedByUserId != null)
            {
                return BadRequest(new
                {
                    message = "Invite already used.",
                    errors = new[] { "This invite has already been used." }
                });
            }

            var frontendUrl = _configuration["Frontend:Url"] ?? "http://localhost:4200";

            var dto = new DocumentInviteDto
            {
                Id = invite.Id,
                Token = invite.Token,
                DocumentId = invite.DocumentId,
                DocumentTitle = invite.Document.Title,
                TeamId = invite.Document.TeamId,
                TeamName = invite.Document.Team.Name,
                CreatedByName = invite.CreatedBy.Name,
                Role = (int)invite.Role,
                ExpiresAt = invite.ExpiresAt,
                IsRevoked = invite.IsRevoked,
                IsUsed = false,
                InviteUrl = $"{frontendUrl}/invite/{invite.Token}"
            };

            return Ok(dto);
        }

        /// <summary>
        /// Aceita um convite. Cria TeamMember (se necessario) e DocumentPermission.
        /// </summary>
        [HttpPost("{token}/accept")]
        public async Task<ActionResult<AcceptInviteResponseDto>> AcceptInvite(string token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return Unauthorized(new { message = "User not found." });

            var invite = await _context.DocumentInvite
                .Include(di => di.Document)
                    .ThenInclude(d => d.Team)
                .FirstOrDefaultAsync(di => di.Token == token);

            if (invite == null)
                return NotFound(new { message = "Invite not found." });

            if (invite.IsRevoked)
            {
                return BadRequest(new
                {
                    message = "Invite revoked.",
                    errors = new[] { "This invite has been revoked." }
                });
            }

            if (invite.ExpiresAt <= DateTime.UtcNow)
            {
                return BadRequest(new
                {
                    message = "Invite expired.",
                    errors = new[] { "This invite has expired." }
                });
            }

            if (invite.UsedByUserId != null)
            {
                return BadRequest(new
                {
                    message = "Invite already used.",
                    errors = new[] { "This invite has already been used." }
                });
            }

            var teamId = invite.Document.TeamId;

            // Verificar se o utilizador ja e membro da equipa
            var existingMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId);

            TeamMember teamMember;

            if (existingMember != null)
            {
                teamMember = existingMember;

                // Se ja e Owner, nao precisa de DocumentPermission
                if (teamMember.Role == TeamRole.Owner)
                {
                    return BadRequest(new
                    {
                        message = "Already has access.",
                        errors = new[] { "You already have full access to all documents in this team." }
                    });
                }
            }
            else
            {
                // Criar novo TeamMember como Member
                teamMember = new TeamMember
                {
                    Name = user.FullName ?? user.Email ?? "Member",
                    UserId = userId,
                    TeamId = teamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };

                _context.TeamMember.Add(teamMember);
                await _context.SaveChangesAsync();
            }

            // Verificar se ja tem DocumentPermission para este documento
            var existingPermission = await _context.DocumentPermission
                .FirstOrDefaultAsync(dp => dp.TeamMemberId == teamMember.Id && dp.DocumentId == invite.DocumentId);

            if (existingPermission != null)
            {
                return BadRequest(new
                {
                    message = "Permission already exists.",
                    errors = new[] { "You already have access to this document." }
                });
            }

            // Criar DocumentPermission com a role definida no convite
            var permission = new DocumentPermission
            {
                DocumentId = invite.DocumentId,
                TeamMemberId = teamMember.Id,
                Role = invite.Role,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DocumentPermission.Add(permission);

            // Marcar convite como usado
            invite.UsedByUserId = userId;

            await _context.SaveChangesAsync();

            var response = new AcceptInviteResponseDto
            {
                TeamId = teamId,
                DocumentId = invite.DocumentId,
                DocumentTitle = invite.Document.Title,
                TeamName = invite.Document.Team.Name,
                DocumentRole = (int)invite.Role
            };

            return Ok(response);
        }

        /// <summary>
        /// Revoga um convite (torna-o inutilizavel).
        /// Apenas Owner ou TeamAdmin podem revogar.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> RevokeInvite(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var invite = await _context.DocumentInvite
                .Include(di => di.Document)
                .FirstOrDefaultAsync(di => di.Id == id);

            if (invite == null)
                return NotFound(new { message = "Invite not found." });

            // Verificar que o caller e Owner ou TeamAdmin
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == invite.Document.TeamId && m.UserId == userId);

            if (callerMember == null || (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can revoke invites." }
                });
            }

            invite.IsRevoked = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
```

---

## Passo 4 — Verificar config `Frontend:Url` (Backend)

Ja existe no `appsettings.json` (linha 14):

```json
"Frontend": {
    "Url": "http://localhost:4200"
}
```

O controller ja le este valor via `_configuration["Frontend:Url"]`. **Nada a fazer neste passo.**

---

## Passo 5 — Modelo e Service no Frontend

### 5.1 Criar ficheiro `fluxnote-frontend/src/app/core/models/document-invite.model.ts`

```typescript
/**
 * Request para criar um convite de documento
 */
export interface CreateDocumentInviteRequest {
  documentId: number;
  role: number; // 0 = Viewer, 1 = Editor
  expirationDays?: number; // Default: 7
}

/**
 * DTO de resposta de convite de documento
 */
export interface DocumentInviteDto {
  id: number;
  token: string;
  documentId: number;
  documentTitle: string;
  teamId: number;
  teamName: string;
  createdByName: string;
  role: number; // 0=Viewer, 1=Editor
  expiresAt: string;
  isRevoked: boolean;
  isUsed: boolean;
  inviteUrl: string;
}

/**
 * Resposta ao aceitar um convite
 */
export interface AcceptInviteResponse {
  teamId: number;
  documentId: number;
  documentTitle: string;
  teamName: string;
  documentRole: number; // 0=Viewer, 1=Editor
}
```

### 5.2 Atualizar `fluxnote-frontend/src/app/core/models/index.ts`

Adicionar esta linha no final:

```typescript
export * from './document-invite.model';
```

O ficheiro completo fica:

```typescript
export * from './user.model';
export * from './document.model';
export * from './team.model';
export * from './notification.model';
export * from './subscription.model';
export * from './document-invite.model';
```

### 5.3 Criar ficheiro `fluxnote-frontend/src/app/core/services/document-invite.service.ts`

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateDocumentInviteRequest, DocumentInviteDto, AcceptInviteResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DocumentInviteService {
  private http = inject(HttpClient);

  createInvite(request: CreateDocumentInviteRequest): Observable<DocumentInviteDto> {
    return this.http.post<DocumentInviteDto>('/api/document-invites', request);
  }

  getInvitesByDocument(documentId: number): Observable<DocumentInviteDto[]> {
    return this.http.get<DocumentInviteDto[]>(`/api/document-invites/by-document/${documentId}`);
  }

  getInviteInfo(token: string): Observable<DocumentInviteDto> {
    return this.http.get<DocumentInviteDto>(`/api/document-invites/${token}/info`);
  }

  acceptInvite(token: string): Observable<AcceptInviteResponse> {
    return this.http.post<AcceptInviteResponse>(`/api/document-invites/${token}/accept`, {});
  }

  revokeInvite(id: number): Observable<void> {
    return this.http.delete<void>(`/api/document-invites/${id}`);
  }
}
```

### 5.4 Atualizar `fluxnote-frontend/src/app/core/services/index.ts`

Adicionar esta linha no final:

```typescript
export { DocumentInviteService } from './document-invite.service';
```

O ficheiro completo fica:

```typescript
export { PanelStateService } from './panel-state.service';
export { AuthService } from './auth.service';
export { DocumentService } from './document.service';
export { TeamService } from './team.service';
export { DocumentPermissionService } from './document-permission.service';
export { DocumentInviteService } from './document-invite.service';
```

---

## Passo 6 — Pagina de Aceitar Convite (Frontend)

### 6.1 Criar pasta `fluxnote-frontend/src/app/features/invites/pages/`

### 6.2 Criar ficheiro `fluxnote-frontend/src/app/features/invites/pages/accept-invite.component.ts`

```typescript
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';
import { DocumentInviteService, AuthService } from '../../../core/services';
import { DocumentInviteDto, AcceptInviteResponse } from '../../../core/models';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Loading -->
        @if (loading()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p class="text-gray-500">A carregar convite...</p>
              </div>
            </app-card-content>
          </app-card>
        }

        <!-- Error -->
        @if (error()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <lucide-icon name="alert-circle" class="h-12 w-12 text-red-500 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Convite Invalido</h2>
                <p class="text-gray-500 mb-6">{{ error() }}</p>
                <app-button (click)="goToDashboard()">Ir para o Dashboard</app-button>
              </div>
            </app-card-content>
          </app-card>
        }

        <!-- Invite Preview -->
        @if (invite() && !accepted() && !error()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-6">
                <lucide-icon name="file-text" class="h-12 w-12 text-emerald-600 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Foste convidado para um documento
                </h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
                  <div class="mb-3">
                    <span class="text-sm text-gray-500">Documento</span>
                    <p class="font-medium text-gray-900 dark:text-white">{{ invite()!.documentTitle }}</p>
                  </div>
                  <div class="mb-3">
                    <span class="text-sm text-gray-500">Equipa</span>
                    <p class="font-medium text-gray-900 dark:text-white">{{ invite()!.teamName }}</p>
                  </div>
                  <div class="mb-3">
                    <span class="text-sm text-gray-500">Convidado por</span>
                    <p class="font-medium text-gray-900 dark:text-white">{{ invite()!.createdByName }}</p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">Permissao</span>
                    <p class="font-medium" [class]="invite()!.role === 1 ? 'text-emerald-600' : 'text-blue-600'">
                      {{ invite()!.role === 1 ? 'Editor' : 'Viewer' }}
                    </p>
                  </div>
                </div>
                <app-button
                  (click)="accept()"
                  [disabled]="accepting()"
                  class="w-full">
                  {{ accepting() ? 'A aceitar...' : 'Aceitar Convite' }}
                </app-button>
              </div>
            </app-card-content>
          </app-card>
        }

        <!-- Success -->
        @if (accepted()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <lucide-icon name="check-circle" class="h-12 w-12 text-emerald-600 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Convite Aceite!</h2>
                <p class="text-gray-500 mb-2">
                  Agora tens acesso ao documento <strong>{{ acceptResult()!.documentTitle }}</strong>
                </p>
                <p class="text-gray-500 mb-6">
                  na equipa <strong>{{ acceptResult()!.teamName }}</strong>
                  como <strong>{{ acceptResult()!.documentRole === 1 ? 'Editor' : 'Viewer' }}</strong>.
                </p>
                <div class="flex gap-3 justify-center">
                  <app-button (click)="goToDocument()">Abrir Documento</app-button>
                  <app-button variant="outline" (click)="goToTeam()">Ver Equipa</app-button>
                </div>
              </div>
            </app-card-content>
          </app-card>
        }
      </div>
    </div>
  `
})
export class AcceptInviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inviteService = inject(DocumentInviteService);
  private authService = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);
  invite = signal<DocumentInviteDto | null>(null);
  accepting = signal(false);
  accepted = signal(false);
  acceptResult = signal<AcceptInviteResponse | null>(null);

  ngOnInit(): void {
    // Verificar se esta autenticado
    if (!this.authService.isAuthenticated()) {
      // Guardar o URL atual para redirect apos login
      const token = this.route.snapshot.params['token'];
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/invite/${token}` }
      });
      return;
    }

    const token = this.route.snapshot.params['token'];
    if (!token) {
      this.error.set('Token de convite em falta.');
      this.loading.set(false);
      return;
    }

    this.inviteService.getInviteInfo(token).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err.error?.errors?.[0] || err.error?.message || 'Convite invalido ou expirado.';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  accept(): void {
    const token = this.route.snapshot.params['token'];
    this.accepting.set(true);

    this.inviteService.acceptInvite(token).subscribe({
      next: (result) => {
        this.acceptResult.set(result);
        this.accepted.set(true);
        this.accepting.set(false);
      },
      error: (err) => {
        const message = err.error?.errors?.[0] || err.error?.message || 'Erro ao aceitar convite.';
        this.error.set(message);
        this.invite.set(null);
        this.accepting.set(false);
      }
    });
  }

  goToDocument(): void {
    const result = this.acceptResult();
    if (result) {
      this.router.navigate(['/editor', result.documentId]);
    }
  }

  goToTeam(): void {
    const result = this.acceptResult();
    if (result) {
      this.router.navigate(['/team-detail', result.teamId]);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
```

### 6.3 Adicionar rota no `fluxnote-frontend/src/app/app.routes.ts`

Adicionar este bloco **antes** do wildcard `{ path: '**', redirectTo: '' }` (e **depois** da rota `version-history`):

```typescript
  {
    path: 'invite/:token',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/invites/pages/accept-invite.component').then((m) => m.AcceptInviteComponent),
  },
```

**IMPORTANTE**: Para que o redirect apos login funcione, e preciso que o `LoginComponent` suporte `returnUrl`. Se ja suportar query param `returnUrl`, funciona automaticamente. Se nao suportar, ha duas opcoes:

**Opcao A** (mais simples): remover o `canActivate: [authGuard]` da rota do invite e deixar o componente tratar do redirect para login (que e o que o codigo acima ja faz no `ngOnInit`).

**Opcao B**: Atualizar o `authGuard` para preservar o `returnUrl`:

No `auth.guard.ts`, alterar o `authGuard` para:

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
```

E no `LoginComponent`, apos login com sucesso, verificar:

```typescript
const returnUrl = this.route.snapshot.queryParams['returnUrl'];
if (returnUrl) {
  this.router.navigateByUrl(returnUrl);
} else {
  this.router.navigate(['/dashboard']);
}
```

---

## Passo 7 — UI de Partilha no Team Detail (Frontend)

### 7.1 Adicionar ao `team-detail.component.ts`

Adicionar ao import no topo do ficheiro:

```typescript
import { DocumentInviteService } from '../../../core/services';
import { DocumentInviteDto } from '../../../core/models';
```

Adicionar ao componente (dentro da class `TeamDetailComponent`):

```typescript
  // --- Invite sharing state ---
  private inviteService = inject(DocumentInviteService);

  shareDocId = signal<number | null>(null);
  shareRole = signal<number>(0); // 0=Viewer, 1=Editor
  shareExpirationDays = signal<number>(7);
  shareGeneratedUrl = signal<string | null>(null);
  shareLoading = signal(false);
  shareCopied = signal(false);
  documentInvites = signal<DocumentInviteDto[]>([]);

  openShareModal(docId: number): void {
    this.shareDocId.set(docId);
    this.shareRole.set(0);
    this.shareExpirationDays.set(7);
    this.shareGeneratedUrl.set(null);
    this.shareCopied.set(false);
    this.loadDocumentInvites(docId);
  }

  closeShareModal(): void {
    this.shareDocId.set(null);
    this.shareGeneratedUrl.set(null);
    this.documentInvites.set([]);
  }

  generateInviteLink(): void {
    const docId = this.shareDocId();
    if (!docId) return;

    this.shareLoading.set(true);
    this.inviteService.createInvite({
      documentId: docId,
      role: this.shareRole(),
      expirationDays: this.shareExpirationDays()
    }).subscribe({
      next: (invite) => {
        this.shareGeneratedUrl.set(invite.inviteUrl);
        this.shareLoading.set(false);
        this.shareCopied.set(false);
        // Recarregar lista de convites
        this.loadDocumentInvites(docId);
      },
      error: (err) => {
        console.error('Error creating invite:', err);
        this.toastService.show('Erro ao criar convite', 'error');
        this.shareLoading.set(false);
      }
    });
  }

  copyInviteLink(): void {
    const url = this.shareGeneratedUrl();
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      this.toastService.show('Link copiado!', 'success');
      setTimeout(() => this.shareCopied.set(false), 3000);
    });
  }

  loadDocumentInvites(docId: number): void {
    this.inviteService.getInvitesByDocument(docId).subscribe({
      next: (invites) => this.documentInvites.set(invites),
      error: () => this.documentInvites.set([])
    });
  }

  revokeInvite(inviteId: number): void {
    this.inviteService.revokeInvite(inviteId).subscribe({
      next: () => {
        this.toastService.show('Convite revogado', 'success');
        const docId = this.shareDocId();
        if (docId) this.loadDocumentInvites(docId);
      },
      error: () => {
        this.toastService.show('Erro ao revogar convite', 'error');
      }
    });
  }
```

### 7.2 Adicionar HTML ao `team-detail.component.html`

**A) Botao "Partilhar"** — adicionar dentro de cada painel de documento (junto aos outros botoes, visivel apenas para Owner/TeamAdmin):

```html
<!-- Botao Partilhar (visivel para Owner e TeamAdmin) -->
@if (selectedTeam()!.currentUserRole >= 1) {
  <button
    (click)="openShareModal(doc.id)"
    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
    <lucide-icon name="share-2" [size]="14"></lucide-icon>
    Partilhar
  </button>
}
```

**B) Modal de Partilha** — adicionar no final do template (antes do `</app-dashboard-layout>`):

```html
<!-- Share Document Modal -->
@if (shareDocId()) {
  <app-modal [isOpen]="true" (close)="closeShareModal()" title="Partilhar Documento">
    <div class="space-y-4">
      <!-- Role Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Permissao a atribuir
        </label>
        <select
          [ngModel]="shareRole()"
          (ngModelChange)="shareRole.set($event)"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
          <option [ngValue]="0">Viewer (apenas leitura)</option>
          <option [ngValue]="1">Editor (leitura e escrita)</option>
        </select>
      </div>

      <!-- Expiration Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expira em
        </label>
        <select
          [ngModel]="shareExpirationDays()"
          (ngModelChange)="shareExpirationDays.set($event)"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
          <option [ngValue]="1">1 dia</option>
          <option [ngValue]="3">3 dias</option>
          <option [ngValue]="7">7 dias</option>
          <option [ngValue]="14">14 dias</option>
          <option [ngValue]="30">30 dias</option>
        </select>
      </div>

      <!-- Generate Button -->
      <app-button
        (click)="generateInviteLink()"
        [disabled]="shareLoading()"
        class="w-full">
        {{ shareLoading() ? 'A gerar...' : 'Gerar Link de Convite' }}
      </app-button>

      <!-- Generated Link -->
      @if (shareGeneratedUrl()) {
        <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Link de Convite
          </label>
          <div class="flex gap-2">
            <input
              type="text"
              [value]="shareGeneratedUrl()"
              readonly
              class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <button
              (click)="copyInviteLink()"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              [class]="shareCopied() ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-white'">
              {{ shareCopied() ? 'Copiado!' : 'Copiar' }}
            </button>
          </div>
        </div>
      }

      <!-- Active Invites List -->
      @if (documentInvites().length > 0) {
        <div class="mt-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Convites Ativos ({{ documentInvites().length }})
          </h4>
          <div class="space-y-2">
            @for (inv of documentInvites(); track inv.id) {
              <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                <div>
                  <span class="font-medium">{{ inv.role === 1 ? 'Editor' : 'Viewer' }}</span>
                  <span class="text-gray-500 mx-1">·</span>
                  <span class="text-gray-500">
                    expira {{ inv.expiresAt | date:'dd/MM/yyyy' }}
                  </span>
                  @if (inv.isUsed) {
                    <span class="text-gray-400 mx-1">·</span>
                    <span class="text-orange-500">Usado</span>
                  }
                </div>
                @if (!inv.isUsed) {
                  <button
                    (click)="revokeInvite(inv.id)"
                    class="text-red-500 hover:text-red-700 text-xs font-medium">
                    Revogar
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  </app-modal>
}
```

---

## Passo 8 — Verificar Guard de Acesso a Documentos (Backend)

### 8.1 `GET /api/documents` (listagem)

**Ja esta implementado.** O `DocumentsController.GetDocuments()` (linhas 94-194) ja filtra documentos:
- Owners veem todos (`ownerTeamIds.Contains(doc.TeamId)`)
- Members so veem documentos com `DocumentPermission`

**MAS** ha um bug: a variavel `ownerTeamIds` so inclui Owners, nao TeamAdmins. Corrigir alterando o nome e a logica:

No `DocumentsController.cs`, **substituir** as linhas 113-116:

```csharp
var ownerTeamIds = userTeamMembers
    .Where(m => m.Role == TeamRole.Owner)
    .Select(m => m.TeamId)
    .ToList();
```

**Por:**

```csharp
var adminOrOwnerTeamIds = userTeamMembers
    .Where(m => m.Role == TeamRole.Owner || m.Role == TeamRole.TeamAdmin)
    .Select(m => m.TeamId)
    .ToList();
```

E **substituir** na linha 156:

```csharp
if (ownerTeamIds.Contains(doc.TeamId))
```

**Por:**

```csharp
if (adminOrOwnerTeamIds.Contains(doc.TeamId))
```

### 8.2 `GET /api/documents/{id}` (detalhe)

**Ja esta implementado.** Linhas 420-484 verificam Owner/TeamAdmin e depois DocumentPermission.

### 8.3 `PUT /api/documents/{id}` (editar)

**Ja esta implementado.** Linhas 508-595 verificam Owner/TeamAdmin e Editor via DocumentPermission. Viewers sao bloqueados.

---

## Passo 9 — Testes Manuais

### Cenario 1: Criar e usar convite
1. Login como Owner da equipa
2. Ir ao Team Detail -> documento -> Partilhar
3. Selecionar "Viewer", gerar link, copiar
4. Abrir noutra janela/browser, login como outro utilizador (que NAO pertence a equipa)
5. Colar o link -> ver preview (nome do doc, equipa, role) -> Aceitar
6. Verificar na base de dados: novo `TeamMember` criado com `Role=Member`, novo `DocumentPermission` criado com `Role=Viewer`

### Cenario 2: Permissoes respeitadas
1. Com o utilizador convidado como Viewer, tentar abrir o documento -> deve funcionar (leitura)
2. Tentar editar -> deve ser bloqueado (403)
3. Tentar abrir outro documento da mesma equipa (via URL direto) -> deve dar 403
4. Na listagem de documentos, so deve aparecer o documento ao qual foi convidado

### Cenario 3: Validacoes do convite
1. Tentar aceitar um convite expirado -> mensagem "This invite has expired."
2. Tentar aceitar um convite revogado -> mensagem "This invite has been revoked."
3. Tentar aceitar um convite ja usado -> mensagem "This invite has already been used."
4. Tentar criar convite como Member -> 403 "Only Owner or Team Admin can create document invites."

### Cenario 4: Utilizador ja membro da equipa
1. Criar convite para documento X
2. Aceitar com utilizador que JA e Member da equipa mas NAO tem acesso ao documento X
3. Verificar: nao cria novo TeamMember, cria DocumentPermission para o documento X

### Cenario 5: Owner/TeamAdmin tenta aceitar convite
1. Owner/TeamAdmin abre link de convite da sua propria equipa
2. Deve receber mensagem "You already have full access to all documents in this team."

---

## Resumo da Ordem de Implementacao

| # | O que | Ficheiros | Acao |
|---|-------|-----------|------|
| 1 | Modelo `DocumentInvite` | `Models/DocumentInvite.cs`, `Data/FluxnoteServerContext.cs` | Criar ficheiro + editar context + migracao |
| 2 | DTOs | `Dtos/DocumentInvites/` (3 ficheiros) | Criar ficheiros |
| 3 | Controller | `Controllers/DocumentInvitesController.cs` | Criar ficheiro |
| 4 | Config URL | (ja existe) | Nada a fazer |
| 5 | Frontend models + service | `core/models/document-invite.model.ts`, `core/services/document-invite.service.ts`, `index.ts` x2 | Criar + editar |
| 6 | Pagina Accept Invite | `features/invites/pages/accept-invite.component.ts`, `app.routes.ts`, `auth.guard.ts` | Criar + editar |
| 7 | UI Partilha no Team Detail | `team-detail.component.ts`, `team-detail.component.html` | Editar |
| 8 | Fix bug listagem docs | `Controllers/DocumentsController.cs` | Editar 2 linhas |
| 9 | Testes manuais | - | Manual |
