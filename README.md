# Fluxnote

## Configuração de Secrets

### 1. Geração de JWT_KEY

#### Gerar chave (Base64)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

```powershell
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "COLAR_KEY_AQUI"
```

### 2. Configuração da Gemini API Key

A aplicação usa Google Gemini AI para funcionalidades como geração de resumos de documentos.

#### Obter API Key ou usar alguma fornecida por alguém da equipa

1. Aceder a <https://aistudio.google.com/apikey>
2. Criar uma nova API key (free tier: 15 req/min, 1M tokens/dia)

```powershell
dotnet user-secrets set "Gemini:ApiKey" "COLAR_API_KEY_AQUI"
```

### 3. Configuração do Email (SMTP2GO)

A aplicação usa SMTP2GO para envio de emails de confirmação em produção.

```powershell
dotnet user-secrets set "EmailOptions:FromEmail" "EMAIL_VERIFICADO_NO_SMTP2GO"
dotnet user-secrets set "EmailOptions:SmtpUser" "SMTP2GO_USERNAME"
dotnet user-secrets set "EmailOptions:SmtpPass" "SMTP2GO_PASSWORD"
```

## Executar com Docker

Para executar o projeto através do Docker, seguir os seguintes passos **na raiz do projeto**:

1. Criar ficheiro `.env` na raiz com as seguintes variáveis:

   ```text
   JWT_KEY=COLAR_JWT_KEY_AQUI
   GEMINI_API_KEY=COLAR_GEMINI_KEY_AQUI
   SMTP_FROM_EMAIL=EMAIL_VERIFICADO_NO_SMTP2GO
   SMTP_USER=SMTP2GO_USERNAME
   SMTP_PASS=SMTP2GO_PASSWORD
   ```

### Ambiente de Desenvolvimento (DEV)

```powershell
# Subir containers DEV
docker compose -p fluxnote up

# Parar containers DEV
docker compose -p fluxnote down

```

### Testes E2E (Playwright)

Os testes E2E correm no ambiente de desenvolvimento (Docker)

#### Pré-requisitos

1. Containers DEV a correr (`docker compose -p fluxnote up`)
2. Dependências do frontend instaladas (`cd fluxnote-frontend && npm install`)
3. Browsers do Playwright instalados (`npx playwright install chromium`)

#### Executar testes

```powershell
cd fluxnote-frontend

# Correr todos os testes (headless)
npm run e2e

# Correr com browser visível
npm run e2e:headed

# Abrir UI interativa do Playwright
npm run e2e:ui

# Ver relatório HTML após execução
npm run e2e:report
```

### Ambiente de Produção (PROD)

```powershell
# Subir containers PROD
docker compose -p fluxnote-prod -f docker-compose.prod.yml up

# Parar containers PROD
docker compose -p fluxnote-prod -f docker-compose.prod.yml down

#### Azure
#Build e push do backend
docker build -t fluxnoteacr.azurecr.io/fluxnote-backend:latest -f fluxnote-backend/Dockerfile ./fluxnote-backend
docker push fluxnoteacr.azurecr.io/fluxnote-backend:latest

#Build e push do frontend
docker build -t fluxnoteacr.azurecr.io/fluxnote-frontend:latest -f fluxnote-frontend/Dockerfile.azure ./fluxnote-frontend

docker push fluxnoteacr.azurecr.io/fluxnote-frontend:latest


```
