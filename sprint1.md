# FluxNote — Sprint 1

**Versão:** 1.0  
**Data de Início:** 05/12/2025  
**Data de Fim:** 03/02/2026  
**Sprint Master:** Rúben Alves
**Equipa:** Miguel Silva, Rúben Alves, Ricardo Oliveira

---

## 1. Visão Geral do Sprint

### 1.1 Objetivo

> **CRUD Utilizador + Dashboard básica com lista de docs + editor funcional (sem tempo real ainda)**

Este sprint foca-se em estabelecer a base funcional da aplicação FluxNote, implementando o sistema de autenticação, a gestão básica de utilizadores, documentos e equipas. O editor de documentos será funcional mas sem sincronização em tempo real (essa funcionalidade fica para o Sprint 2).

### 1.2 Duração

- **Início:** 05/12/2025
- **Fim:** 03/02/2026
- **Duração Total:** ~8 semanas (incluindo período de férias)

### 1.3 Requisitos Funcionais Incluídos

| ID | Módulo | Descrição | Prioridade |
|----|--------|-----------|------------|
| RF01 | M1 - Autenticação | O sistema deverá permitir o registo de novos utilizadores através de email e password | Must Have |
| RF04 | M1 - Autenticação | O sistema deverá permitir a edição da conta do utilizador | Must Have |
| RF05 | M2 - Gestão Documentos | O sistema deverá permitir a criação de novos documentos | Must Have |
| RF06 | M2 - Gestão Documentos | O sistema deverá permitir a edição de documentos existentes | Must Have |
| RF15 | M4 - Permissões | O sistema deverá suportar a role Owner com permissão total sobre a equipa e os documentos a ela associados | Must Have |
| RF28 | M7 - Equipas | O sistema deverá permitir a criação de equipas | Must Have |

---

## 2. User Stories

### 2.1 US01 — Registo de Utilizador (RF01)

**Como** visitante da plataforma,  
**Quero** criar uma conta com email e password,  
**Para que** possa aceder às funcionalidades da aplicação.

#### Critérios de Aceitação

- [X] O formulário de registo inclui campos para email, password e nome completo
- [x] A password deve ter no mínimo 8 caracteres, incluir letras, números e símbolos
- [x] O email deve ser único no sistema
- [x] Após registo, é enviado um email de confirmação
- [x] A conta fica em estado `PendingEmailConfirmation` até confirmação
- [x] Após confirmar o email, o utilizador é redirecionado para a página de login
- [x] Mensagens de erro claras para validações falhadas (**email duplicado**, password fraca)

#### Tasks Técnicas

**Backend:**

- [x] Entidade `User` (IdentityUser + FullName, ProfilePictureUrl, AuthProvider, AccountStatus, CreatedAt/UpdatedAt)
- [x] Endpoint `POST /api/auth/register` com:
  - 409 para email duplicado
  - 400 para validações/Identity
  - criação com `AccountStatus = PendingEmailConfirmation`
- [x] ASP.NET Core Identity configurado com requisitos de password (PBKDF2 por defeito do Identity)
- [x] Validação de registo com FluentValidation (`RegisterRequestValidator`)
- [x] Envio de confirmação por email via `IEmailSender`:
  - Dev: `ConsoleEmailSender` + `DevEmailStore` (link acessível por `/api/auth/dev/last-confirmation-link`)
  - Produção: ainda sem provider real (SendGrid/SMTP por configurar)
- [x] Endpoint `GET /api/auth/confirm-email` (token base64url, ativa conta e atualiza `AccountStatus`)
- [x] Migrations do Identity + `RefreshTokens` com auto-migrate em startup (fora de ambiente de testes)

**Frontend:**

- [x] Página de registo (`/register`) com validações em tempo real (tamanho, número, símbolo, confirmação)
- [x] Feedback por Toasts (sucesso/erro) e redirecionamento pós-registo
- [x] Página de “email pendente” (`/pending-email`) protegida por `pendingEmailGuard`
- [x] Página de confirmação (`/confirm-email`) com consumo de query params e chamada ao backend

---

### 2.2 US02 — Autenticação (Login)

**Como** utilizador registado,  
**Quero** fazer login na plataforma,  
**Para que** possa aceder à minha conta e documentos.

#### Critérios de Aceitação

- [x] O formulário de login aceita email e password
- [x] Opção "Lembrar-me" que estende a sessão de 7 para 30 dias
- [x] Após login bem sucedido, redirecionamento para a dashboard
- [x] Access token com validade de 15 minutos
- [x] Refresh token armazenado em cookie httpOnly
- [X] Mensagens de erro para credenciais inválidas, conta bloquada ou ainda não confirmada
- [x] Link de confirmação visivel (apenas para dev)

#### Tasks Técnicas

**Backend:**

- [x] Endpoint `POST /api/auth/login` com:
  - 401 para credenciais inválidas
  - 403 para conta não confirmada/inativa
  - 423 para lockout (quando aplicável)
- [x] JWT configurado em `Program.cs` (Issuer/Audience/Key, AccessTokenMinutes=15)
- [x] Refresh token com política **Sliding + Absolute Cap** persistida por sessão:
  - `IdleDays` e `AbsoluteDays` guardados na BD
  - `SessionId`, `SessionStartedAt`, `LastUsedAt`
- [x] Endpoint `POST /api/auth/refresh` com:
  - rotação obrigatória
  - reuse detection (revoga sessão)
  - validação de idle timeout + absolute cap
- [x] Endpoints `POST /api/auth/logout` e `POST /api/auth/logout-all`
- [x] Tabela `RefreshTokens` com hash, `TokenHash` único e relacionamentos ao `User`
- [x] Rate limiting global com AspNetCoreRateLimit (aplicado antes de controllers)

**Frontend:**

- [x] Página de login (`/login`) com opção “Remember me”
- [x] `AuthService` com access token **apenas em memória** (signals) e `initAuth()` via `/refresh` ao arrancar
- [x] Refresh “single-flight” + tratamento de 429 no login/refresh
- [x] `AuthInterceptor` adiciona Bearer token e faz refresh automático em 401
- [x] Guards `authGuard`/`guestGuard` para rotas protegidas
- [x] Logout chama `POST /api/auth/logout-all` e limpa estado local

---

### 2.3 US03 — Gerir Conta (RF04)

**Como** utilizador autenticado,  
**Quero** editar os dados da minha conta,  
**Para que** possa manter as minhas informações atualizadas.

#### Critérios de Aceitação

- [ ] Posso editar o meu nome completo
- [ ] Posso editar/adicionar o meu avatar (URL)
- [ ] Posso alterar a minha password (requer password atual)
- [ ] As alterações são guardadas e refletidas imediatamente
- [ ] Feedback visual de sucesso/erro nas operações
- [ ] Alteração de password requer confirmação

#### Tasks Técnicas

**Backend:**

- [x] Implementar endpoint `GET /api/users/me`
- [ ] Implementar endpoint `PUT /api/users/me` (nome, avatar)
- [ ] Implementar endpoint `PUT /api/users/me/password` (requer password atual)
- [ ] Criar DTOs: `UserProfileDto`, `UpdateProfileRequest`, `ChangePasswordRequest`
- [ ] Validar password atual e aplicar requisitos do Identity

**Frontend:**

- [x] UI base em `/settings` e `/profile` (sem integração backend)
- [ ] Integrar com `GET/PUT /api/users/me`
- [ ] Implementar alteração de password (com confirmação)
- [ ] Ligar upload/preview de avatar (URL)
- [ ] Adicionar confirmação antes de alterações sensíveis

---

### 2.4 US04 — Criar Equipa (RF28)

**Como** utilizador autenticado,  
**Quero** criar uma equipa,  
**Para que** possa organizar os meus documentos e colaborar com outros.

#### Critérios de Aceitação

- [ ] Posso criar uma equipa com um nome
- [ ] Ao criar uma equipa, torno-me automaticamente o Owner
- [ ] A equipa aparece na minha lista de equipas
- [ ] Não posso criar mais equipas do que o limite do meu plano (Free = 1)
- [ ] Mensagem de erro clara se atingir o limite

#### Tasks Técnicas

**Backend:**

- [ ] Criar entidades `Team` e `TeamMember` (conforme model)
- [ ] Implementar `POST /api/teams` e `GET /api/teams`
- [ ] Validar limite do plano (Free = 1 equipa)
- [ ] Criar migrations para Teams/TeamMembers

**Frontend:**

- [x] UI de equipas (`/teams` e `/team-detail`) com dados mock em `TeamService`
- [x] Modal de seleção de equipa na dashboard (mock)
- [ ] Ligar à API real (`GET/POST /api/teams`)
- [ ] Mostrar contador real de equipas vs limite do plano

---

### 2.5 US05 — Role Owner (RF15)

**Como** Owner de uma equipa,  
**Quero** ter controlo total sobre a equipa e documentos,  
**Para que** possa gerir todos os aspetos do meu projeto.

#### Critérios de Aceitação

- [ ] Como Owner, posso ver todos os documentos da equipa
- [ ] Como Owner, posso editar qualquer documento da equipa
- [ ] Como Owner, posso eliminar documentos (mover para lixeira)
- [ ] Como Owner, posso restaurar documentos da lixeira
- [ ] Como Owner, posso eliminar permanentemente documentos
- [ ] Como Owner, posso renomear a equipa
- [ ] Como Owner, posso eliminar a equipa

#### Tasks Técnicas

**Backend:**

- [ ] Implementar `TeamRole` e políticas `[Authorize]` para Owner
- [ ] Criar método `ResolveDocumentAccess` (permissões por equipa)
- [ ] `PUT /api/teams/{teamId}` (renomear) e `DELETE /api/teams/{teamId}` (eliminar)
- [ ] Handlers de policy para verificação de roles

**Frontend:**

- [ ] Mostrar opções de gestão só para Owner (depende de API)
- [ ] Modal de confirmação para ações destrutivas
- [ ] Página de settings da equipa (`/teams/{id}/settings`)

---

### 2.6 US06 — Criar Documento (RF05)

**Como** utilizador autenticado,  
**Quero** criar um novo documento,  
**Para que** possa começar a escrever conteúdo.

#### Critérios de Aceitação

- [ ] Posso criar um documento com um título
- [ ] Se não especificar equipa, é criada uma automaticamente
- [ ] Se especificar equipa (onde sou Owner), o documento é associado a ela
- [ ] O documento aparece na minha dashboard
- [ ] Após criação, sou redirecionado para o editor
- [ ] Não posso criar mais documentos do que o limite do plano (Free = 10)

#### Tasks Técnicas

**Backend:**

- [ ] Criar entidade `Document` (conforme model)
- [ ] Implementar `POST /api/documents`
- [ ] Criar lógica de “equipa automática” se não for passada
- [ ] Validar limites do plano (Free = 10 docs)
- [ ] Inicializar conteúdo com Y.Doc vazio
- [ ] Migration para Documents

**Frontend:**

- [x] Botão “Novo Documento” + modal de seleção de equipa (mock)
- [x] `DocumentService` com lista mock em memória
- [ ] Integrar com `POST /api/documents` e limites reais
- [ ] Mostrar contador real de documentos vs limite

---

### 2.7 US07 — Editar Documento (RF06)

**Como** utilizador com permissão de edição,  
**Quero** editar o conteúdo de um documento,  
**Para que** possa desenvolver o meu trabalho.

#### Critérios de Aceitação

- [ ] Posso abrir um documento e ver o seu conteúdo
- [ ] Posso editar o texto usando um editor rico (Quill)
- [ ] As alterações são guardadas automaticamente (debounce de 2 segundos)
- [ ] Posso alterar o título do documento
- [ ] Feedback visual de "A guardar..." e "Guardado"
- [ ] O editor suporta formatação básica (negrito, itálico, listas, títulos)

**Nota:** Neste sprint, a edição NÃO é em tempo real. Cada utilizador trabalha na sua própria sessão e as alterações são guardadas no servidor. A sincronização em tempo real será implementada no Sprint 2.

#### Tasks Técnicas

**Backend:**

- [ ] `GET /api/documents/{id}` (metadados)
- [ ] `GET /api/documents/{id}/content` (Y.Doc)
- [ ] `PUT /api/documents/{id}` (metadados)
- [ ] `PUT /api/documents/{id}/content` (guardar conteúdo)
- [ ] DTOs para Document

**Frontend:**

- [x] Página de editor (`/editor`) com UI base (mock, sem Quill)
- [x] Painéis de comentários/histórico/AI (mock)
- [ ] Integrar Quill editor com toolbar real
- [ ] Auto-save com debounce e `PUT /api/documents/{id}/content`
- [ ] Campo editável para título + indicador “A guardar/Guardado”

---

### 2.8 US08 — Dashboard com Lista de Documentos

**Como** utilizador autenticado,  
**Quero** ver uma lista dos meus documentos,  
**Para que** possa aceder rapidamente ao meu trabalho.

#### Critérios de Aceitação

- [ ] Após login, vejo a dashboard com os meus documentos
- [ ] Cada documento mostra: título, equipa, última atualização
- [ ] Posso clicar num documento para o abrir
- [ ] A lista está ordenada por última atualização (mais recentes primeiro)
- [ ] Interface limpa e responsiva

#### Tasks Técnicas

**Backend:**

- [ ] `GET /api/documents` com paginação
- [ ] Filtros: `teamId`, `search`
- [ ] Ordenação: `updatedAt DESC`

**Frontend:**

- [x] Página `/dashboard` com UI e cards mock
- [x] Navegação para `/editor` (mock)
- [ ] Integrar com `GET /api/documents` e paginação
- [ ] Loading + empty state ligados a dados reais

---

## 3. Modelo de Dados (Sprint 1)

### 3.1 Entidades

```
┌──────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│      User        │     │      Team        │     │    Document        │
├──────────────────┤     ├──────────────────┤     ├────────────────────┤
│ Id (PK)          │     │ Id (PK)          │     │ Id (PK)            │
│ Email (unique)   │──┐  │ Name             │──┐  │ Title              │
│ PasswordHash     │  │  │ OwnerId (FK)     │  │  │ TeamId (FK)        │
│ FullName         │  │  │ CreatedAt        │  │  │ Content (VARBINARY)│
│ ProfilePictureUrl│  │  │ UpdatedAt        │  │  │ PlainText          │
│ AuthProvider     │  │  │ IsActive         │  │  │ CreatedAt          │
│ EmailConfirmed   │  │  │ DeletionScheduled│  │  │ UpdatedAt          │
│ CreatedAt        │  │  └──────────────────┘  │  │ CreatedById (FK)   │
│ UpdatedAt        │  │          │             │  │ IsDeleted          │
│ AccountStatus    │  │          │             │  │ DeletedAt          │
└──────────────────┘  │    ┌─────┴──────┐      │  └────────────────────┘
        │             └───►│TeamMember  │◄─────┘
        │                  ├────────────┤
        │                  │ Id (PK)    │
        └────────────────► │ TeamId (FK)│
                           │ UserId (FK)│
                           │ Role       │
                           │ JoinedAt   │
                           └────────────┘
```

### 3.2 Enums

```csharp
public enum AuthProvider
{
    Local = 0,
    Google = 1,
    Microsoft = 2
}

public enum AccountStatus
{
    PendingEmailConfirmation = 0,
    Active = 1,
    Suspended = 2,
    Blocked = 3
}

public enum TeamRole
{
    Member = 0,
    TeamAdmin = 1,
    Owner = 2
}
```

---

## 4. API Endpoints (Sprint 1)

### 4.1 Autenticação

| Método | Endpoint | Descrição | Estado |
|--------|----------|-----------|--------|
| POST | `/api/auth/register` | Registo de novo utilizador | Implementado |
| POST | `/api/auth/login` | Autenticação | Implementado |
| POST | `/api/auth/refresh` | Refresh do access token | Implementado |
| POST | `/api/auth/logout` | Terminar sessão (sessão atual) | Implementado |
| POST | `/api/auth/logout-all` | Terminar todas as sessões | Implementado |
| GET | `/api/auth/confirm-email` | Confirmar email | Implementado |
| GET | `/api/auth/dev/last-confirmation-link` | Link de confirmação (dev) | Implementado |
| POST | `/api/auth/ping` | Health check simples | Implementado |

### 4.2 Utilizador

| Método | Endpoint | Descrição | Estado |
|--------|----------|-----------|--------|
| GET | `/api/users/me` | Obter perfil do utilizador atual | Por implementar |
| PUT | `/api/users/me` | Atualizar perfil | Por implementar |
| PUT | `/api/users/me/password` | Alterar password | Por implementar |

### 4.3 Equipas

| Método | Endpoint | Descrição | Estado |
|--------|----------|-----------|--------|
| GET | `/api/teams` | Listar equipas do utilizador | Por implementar |
| POST | `/api/teams` | Criar equipa | Por implementar |
| GET | `/api/teams/{id}` | Obter detalhes da equipa | Por implementar |
| PUT | `/api/teams/{id}` | Atualizar equipa (Owner) | Por implementar |
| DELETE | `/api/teams/{id}` | Eliminar equipa (Owner) | Por implementar |

### 4.4 Documentos

| Método | Endpoint | Descrição | Estado |
|--------|----------|-----------|--------|
| GET | `/api/documents` | Listar documentos | Por implementar |
| POST | `/api/documents` | Criar documento | Por implementar |
| GET | `/api/documents/{id}` | Obter metadados do documento | Por implementar |
| GET | `/api/documents/{id}/content` | Obter conteúdo (Y.Doc) | Por implementar |
| PUT | `/api/documents/{id}` | Atualizar metadados | Por implementar |
| PUT | `/api/documents/{id}/content` | Guardar conteúdo | Por implementar |
| DELETE | `/api/documents/{id}` | Mover para lixeira (Owner) | Por implementar |

---

## 5. Arquitetura de Pastas

### 5.1 Backend (ASP.NET Core)

```
FluxNote/
├── fluxnote-backend/
│   ├── Controllers/
│   │   └── AuthController.cs
│   ├── Data/
│   │   └── FluxnoteServerContext.cs
│   ├── Dtos/
│   │   └── Auth/
│   ├── Models/
│   │   ├── User.cs
│   │   └── RefreshTokens.cs
│   ├── Services/
│   │   ├── Auth/
│   │   │   └── TokenService.cs
│   │   └── Email/
│   ├── Validators/
│   ├── Migrations/
│   ├── Program.cs
│   └── appsettings*.json
└── Fluxnote.Backend.Tests/
```

### 5.2 Frontend (Angular)

```
fluxnote-frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/
│   │   │   └── services/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── dashboard/
│   │   │   ├── editor/
│   │   │   ├── teams/
│   │   │   └── settings/
│   │   ├── layout/
│   │   └── shared/
│   │       ├── components/
│   │       └── models/
│   └── environments/
```

---

## 6. Testes

### 6.1 Testes Unitários (Backend)

| Componente | Casos de Teste | Estado |
|------------|----------------|--------|
| Auth (Integration) | Registo válido + link confirmação | Implementado |
| Auth (Integration) | Registo com email duplicado | Implementado |
| Auth (Integration) | Confirmar email (token válido) | Implementado |
| Auth (Integration) | Login válido/ inválido/ email não confirmado | Implementado |
| Auth (Integration) | Refresh (válido, inválido, reuse detection) | Implementado |
| Auth (Integration) | Logout / LogoutAll | Implementado |
| UserService | Atualização de perfil | Por implementar |
| TeamService | Criação de equipa | Por implementar |
| DocumentService | Criação / permissões | Por implementar |

### 6.2 Testes de Integração

| Fluxo | Descrição |
|-------|-----------|
| Auth Flow | Registo → Confirmação Email → Login | Implementado |
| Document Flow | Login → Criar Doc → Editar → Guardar | Por implementar |
| Team Flow | Login → Criar Equipa → Criar Doc na Equipa | Por implementar |

### 6.3 Cobertura Esperada

- **Testes Unitários:** ≥80%
- **Testes de Integração:** ≥60%

---

## 7. Definition of Done

Um requisito/user story considera-se **DONE** quando:

- [ ] Código implementado e a funcionar localmente
- [ ] Testes unitários escritos e a passar
- [ ] Code review aprovado por outro membro da equipa
- [ ] Documentação de API atualizada (Swagger)
- [ ] Sem erros de lint/build
- [ ] Merge para branch `develop` concluído
- [ ] Testado manualmente nos browsers principais (Chrome, Firefox)

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Integração Y.js/Quill complexa | Média | Alto | Começar com POC simples antes de integrar |
| Configuração Identity demorada | Média | Médio | Seguir documentação oficial, usar templates |
| SendGrid configuração | Baixa | Baixo | Testar com email local (MailHog) primeiro |
| Scope creep | Média | Alto | Manter foco nos RFs definidos, backlog para o resto |

---

## 9. Notas Técnicas

### 9.1 Configuração JWT

```csharp
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "FluxNote",
            ValidAudience = "FluxNote",
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero
        };
    });
```

### 9.2 Password Requirements

```csharp
options.Password.RequiredLength = 8;
options.Password.RequireDigit = true;
options.Password.RequireLowercase = true;
options.Password.RequireUppercase = true;
options.Password.RequireNonAlphanumeric = true;
```

### 9.3 Quill Editor Config (Básico)

```typescript
modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'header': [1, 2, 3, false] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ]
};
```

### 9.4 Refresh Tokens (Política de Sessão)

- **Access Token**: 15 minutos (JWT, em memória no frontend)
- **Refresh Token**: cookie HttpOnly, hash na BD
- **Sliding expiration**: `IdleDays` (default 7)
- **Absolute cap**: `AbsoluteDays` (7 ou 30 com remember me)
- **Regra**: `newExpiresAt = min(now + idleDays, sessionStartedAt + absoluteDays)`
- **Reuse detection**: token revogado → revoga sessão inteira

### 9.5 Rate Limiting

- Middleware `AspNetCoreRateLimit` aplicado antes de controllers/auth
- Headers expostos: `Retry-After`, `X-Rate-Limit-*`
- Respostas esperadas: **429** quando o limite é atingido

---

## 10. Distribuição de Tarefas

| Tarefa | Responsável | Estimativa |
|--------|-------------|------------|
| Setup inicial do projeto Backend | Ricardo | 8h |
| Configuração ASP.NET Identity | Rúben | 16h |
| Endpoints de Autenticação | Rúben | 24h |
| Endpoints de User | Rúben | 8h |
| Endpoints de Teams | Miguel | 16h |
| Endpoints de Documents | Ricardo | 24h |
| Setup Angular + Routing | Miguel | 8h |
| Páginas Auth (Login/Register) | Miguel | 16h |
| Dashboard + Lista Docs | Ricardo | 16h |
| Editor com Quill | Ricardo | 24h |
| Página de Settings | Miguel | 8h |
| Testes Unitários | Rúben | 24h |
| Testes de Integração | Ricardo | 16h |
| Code Review + Fixes | Todos | 16h |

**Total Estimado:** ~224h (~75h por pessoa)

---

## 11. Entregáveis do Sprint

1. **Backend API funcional** com autenticação, gestão de utilizadores, equipas e documentos
2. **Frontend Angular** com páginas de auth, dashboard, editor e settings
3. **Base de dados** com schema para User, Team, TeamMember, Document
4. **Documentação Swagger** da API
5. **Suite de testes** unitários e de integração
6. **README** com instruções de setup

---

**Fim do documento Sprint 1**
