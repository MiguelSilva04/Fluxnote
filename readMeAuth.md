# Testes de Refresh Token (PowerShell)

## Concorrencial (em paralelo)

```powershell
1..40 | ForEach-Object -Parallel {
    try {
        $r = Invoke-WebRequest -Uri "https://localhost:7041/api/auth/refresh" -Method POST -SkipHttpErrorCheck -SkipCertificateCheck
        "$($_) -> $($r.StatusCode)"
    } catch {
        "$($_) -> EXCEPTION: $($_.Exception.Message)"
    }
} -ThrottleLimit 20
```

## Sequencial

```powershell
1..40 | ForEach-Object {
  $r = Invoke-WebRequest -Uri "https://localhost:7041/api/auth/refresh" -Method POST -SkipHttpErrorCheck -SkipCertificateCheck
  "$_ -> $($r.StatusCode)"
}
```

## Único

```powershell
Invoke-WebRequest -Uri https://localhost:7041/api/auth/refresh -Method POST -SkipHttpErrorCheck -SkipCertificateCheck
```

## Geração de JWT_KEY

## Gerar chave (Base64)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Guardar em user-secrets

```powershell
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "COLAR_KEY_AQUI"
```

## Para executar o projeto através do Docker, seguir os seguintes passos **na raiz do projeto**

1. inserir *JWT_KEY=COLAR_KEY_AQUI* no .env
2. correr *docker compose down*
3. correr *docker compose up --build*

## Resumo de Avanço na Task de Auth

## Auth & Session Management – Technical Overview

Este documento descreve a arquitetura de autenticação e gestão de sessão implementada nos últimos dois User Stories,
incluindo decisões de segurança, estrutura de tokens, políticas de expiração, rate limiting e impacto no frontend.

O objetivo é garantir que toda a equipa:

- entende como a autenticação funciona
- sabe porque certas decisões foram tomadas
- evita quebrar invariantes de segurança no futuro

## 1. Visão Geral da Arquitetura

- Access Token em memória + Refresh Token em cookie HttpOnly

### Access Token (JWT)

- Curta duração (15 minutos)
- Contém claims do utilizador
- Nunca é persistido (não vai para localStorage nem sessionStorage)

### Refresh Token

- Longa duração
- Armazenado apenas em cookie HttpOnly
- Guardado na base de dados apenas como hash
- Rotação obrigatória a cada refresh

Esta separação reduz significativamente o impacto de XSS e limita a janela de ataque em caso de comprometimento.

## 2. Ciclo de Vida da Sessão

### 2.1 Login

No login bem-sucedido:

- É criado um Access Token (JWT)
- É criado um Refresh Token (random, high entropy)
- O refresh token é:
  - guardado na BD como hash
  - associado a uma sessão
  - enviado ao browser como cookie HttpOnly
- O access token é devolvido ao frontend e guardado apenas em memória

Cada login cria uma nova sessão / dispositivo.

## 3. Sliding Expiration + Absolute Cap (ponto central do sistema)

A sessão usa duas regras simultâneas:

### 3.1 Sliding Expiration (Idle Timeout)

A sessão mantém-se ativa desde que o utilizador a use regularmente.

Exemplo:

- Idle window = 7 dias

Regra:

- Se o utilizador passar mais de idleDays sem usar a sessão → expira

Isto protege contra:

- tokens roubados mas não usados
- sessões abandonadas

### 3.2 Absolute Cap (limite máximo)

Independentemente da atividade, a sessão tem um fim definitivo.

Exemplo:

- 7 dias sem remember me
- 30 dias com remember me

Regra:

- Se now >= sessionStartedAt + absoluteDays → logout forçado

Isto protege contra:

- sessões infinitas
- dispositivos esquecidos
- uso prolongado de tokens comprometidos

### 3.3 Regra final de validade

Uma sessão é válida apenas se ambas forem verdadeiras:

- now < sessionStartedAt + absoluteDays
- now - lastUsedAt <= idleDays

No refresh, a nova expiração é sempre:

- min(now + idleDays, sessionStartedAt + absoluteDays)

A política não muda a meio da sessão.

## 4. Refresh Token Rotation & Reuse Detection

Cada chamada a /refresh:

- O refresh token atual é revogado
- Um novo refresh token é gerado
- O novo token herda:
  - SessionId
  - SessionStartedAt
  - IdleDays / AbsoluteDays
- O cookie é atualizado

### Reuse Detection

Se um refresh token revogado voltar a aparecer:

- Assume-se comprometimento
- Toda a sessão é revogada
- O utilizador é forçado a autenticar novamente

## 5. Logout

### Logout (sessão atual)

- Revoga apenas a sessão/dispositivo atual
- Remove o cookie HttpOnly

### Logout All

- Revoga todas as sessões do utilizador

Útil para:

- mudança de password
- suspeita de comprometimento

Ambos os endpoints são idempotentes.

## 6. Frontend – Mudanças Importantes

### 6.1 Onde o token é guardado

- ❌ localStorage
- ❌ sessionStorage
- ✅ apenas em memória (Angular signals)

Após refresh de página:

- o access token perde-se
- o frontend chama sempre /refresh
- se o refresh token for válido → sessão recuperada

### 6.2 Inicialização da sessão

No arranque da app:

- O frontend chama /refresh
- Se sucesso:
  - guarda access token em memória
  - extrai user a partir do JWT
- Se falhar:
  - estado = unauthenticated

## 7. Rate Limiting

Foi implementado rate limiting por IP usando AspNetCoreRateLimit.

Objetivos:

- Proteger: login, registo, refresh
- Evitar brute force e abuse
- Não quebrar UX normal

### Comportamento esperado

Login:

- cooldown após várias tentativas falhadas
- apenas relevante quando o email existe

Refresh:

- limitado, mas permissivo o suficiente para:
  - reloads
  - múltiplos tabs

Headers expostos:

- Retry-After
- X-Rate-Limit-*

Nota importante:

O rate limiting é aplicado antes de:

- controllers
- autenticação
- lógica de negócio

Ou seja:

- não depende dos return do controller
- erros 401/403 não impedem o rate limit de contar

## 8. Códigos de Estado (decisão consciente)

- 401 Unauthorized: sessão inválida, refresh expirado
- 429 Too Many Requests: rate limit atingido
- 409 Conflict: conflitos de domínio (email já existe, estado inválido)

Isto permite ao frontend distinguir:

- erro de autenticação
- erro de abuso
- erro funcional

## 9. Garantias de Segurança

Este sistema garante:

- Nenhum token sensível persistido no browser
- Tokens de curta duração
- Refresh tokens:
  - hashed na BD
  - rotativos
  - com reuse detection
- Sessões finitas (absolute cap)
- Sessões abandonadas expiram (idle timeout)
- Rate limiting aplicado a endpoints críticos

## 10. Invariantes a NÃO quebrar

⚠️ Importante para futuros desenvolvimentos:

- Nunca guardar access token em storage persistente
- Nunca devolver refresh token no body
- Nunca permitir refresh sem rotação
- Nunca remover o absolute cap
- Não alterar políticas de sessão a meio de uma sessão
- Não “apanhar” 429 no backend (é responsabilidade do middleware)
