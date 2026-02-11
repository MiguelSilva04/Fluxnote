# Fluxnote

## Configuração de Secrets

### 1. Geração de JWT_KEY

#### Gerar chave (Base64)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### Guardar em user-secrets (desenvolvimento local)

```powershell
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "COLAR_KEY_AQUI"
```

### 2. Configuração da Gemini API Key

A aplicação usa Google Gemini AI para funcionalidades como geração de resumos de documentos.

#### Obter API Key ou usar alguma fornecida por alguém da equipa

1. Aceder a <https://aistudio.google.com/apikey>
2. Criar uma nova API key (free tier: 15 req/min, 1M tokens/dia)

#### Guardar em user-secrets  (desenvolvimento local)

```powershell
dotnet user-secrets set "Gemini:ApiKey" "COLAR_API_KEY_AQUI"
```

## Executar com Docker

Para executar o projeto através do Docker, seguir os seguintes passos **na raiz do projeto**:

1. Criar ficheiro `.env` na raiz com as seguintes variáveis:

   ```text
   JWT_KEY=COLAR_JWT_KEY_AQUI
   GEMINI_API_KEY=COLAR_GEMINI_KEY_AQUI
   ```

### Ambiente de Desenvolvimento (DEV)

```powershell
# Subir containers DEV
docker compose -p fluxnote up

# Parar containers DEV
docker compose -p fluxnote down

```

### Ambiente de Produção (PROD)

```powershell
# Subir containers PROD
docker compose -p fluxnote-prod -f docker-compose.prod.yml up

# Parar containers PROD
docker compose -p fluxnote-prod -f docker-compose.prod.yml down

```
