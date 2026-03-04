// ==============================================================================
// PROGRAM.CS - Ponto de Entrada e Configuração da Aplicação Fluxnote Backend
// ==============================================================================
//
// Este ficheiro configura todos os serviços e middleware da aplicação ASP.NET Core.
//
// ÍNDICE DE CONFIGURAÇÕES:
// 1. Base de Dados (Entity Framework Core + SQL Server)
// 2. Autenticação JWT Bearer
// 3. Rate Limiting (AspNetCoreRateLimit)
// 4. Serviços de Email (Dev/Produção)
// 5. ASP.NET Core Identity
// 6. CORS (Cross-Origin Resource Sharing)
// 7. Swagger/OpenAPI
// 8. Pipeline de Middleware
//
// DEPENDÊNCIAS (appsettings.json):
// - ConnectionStrings:FluxnoteServerContext
// - Jwt:Key, Jwt:Issuer, Jwt:Audience
// - IpRateLimiting (secção)
// - EmailOptions (secção)
// - Auth:RefreshIdleDays, Auth:RefreshAbsoluteDays, etc.
//
// ==============================================================================

using AspNetCoreRateLimit;
using FluentValidation;
using FluentValidation.AspNetCore;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Hubs;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.AI;
using Fluxnote.Backend.Services.Auth;
using Fluxnote.Backend.Services.Authorization;
using Fluxnote.Backend.Services.Email;
using Fluxnote.Backend.Services.Storage;
using Fluxnote.Backend.Validators;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.MicrosoftAccount;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ==============================================================================
// 1. BASE DE DADOS - Entity Framework Core com SQL Server
// ==============================================================================
// Configura o contexto EF Core com SQL Server (LocalDB em desenvolvimento).
// Connection string definida em appsettings.json.
builder.Services.AddDbContext<FluxnoteServerContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("FluxnoteServerContext") ?? throw new InvalidOperationException("Connection string 'FluxnoteServerContext' not found."),
        sqlOptions =>
        {
            // Aumentar timeout para cold start da BD no Azure (quando a BD "acorda")
            sqlOptions.CommandTimeout(60); // 60 segundos (default: 30)
            // Retry automático em caso de falha temporária (transient faults)
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null
            );
        }
    ));

// ==============================================================================
// 2. AUTENTICAÇÃO JWT BEARER
// ==============================================================================
// Configuração do JSON Web Token para autenticação stateless.
// Chave, emissor e audiência definidos em appsettings.json.

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var microsoftClientId = builder.Configuration["Authentication:Microsoft:ClientId"];
var microsoftClientSecret = builder.Configuration["Authentication:Microsoft:ClientSecret"];

if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key missing (Jwt__Key).");

// Configuração de serviços da aplicação

// Esquema de autenticação JWT Bearer
// - ValidateIssuer/Audience: Verifica se o token foi emitido por esta aplicação
// - ValidateLifetime: Verifica se o token não expirou
// - ClockSkew: Tolerância de 30 segundos para diferenças de relógio
var authenticationBuilder = builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        // SignalR envia o token JWT como query string (?access_token=...)
        // em vez de header Authorization (limitação do WebSocket)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authenticationBuilder.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.CallbackPath = "/api/auth/google-callback";
        options.SignInScheme = IdentityConstants.ExternalScheme;
        options.SaveTokens = true;
        options.Scope.Add("openid");

        // Com proxy reverso, frontend e backend aparecem no mesmo domain para o browser
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;

        options.Events.OnRemoteFailure = context =>
        {
            var errorUrl = builder.Configuration["Authentication:ExternalErrorUrl"] ?? "http://localhost:4200/auth/external-error";
            context.Response.Redirect($"{errorUrl}?error=external_provider_error&message={Uri.EscapeDataString(context.Failure?.Message ?? "Authentication failed")}");
            context.HandleResponse();
            return Task.CompletedTask;
        };
    });
}

if (!string.IsNullOrWhiteSpace(microsoftClientId) && !string.IsNullOrWhiteSpace(microsoftClientSecret))
{
    authenticationBuilder.AddMicrosoftAccount(options =>
    {
        options.ClientId = microsoftClientId;
        options.ClientSecret = microsoftClientSecret;
        options.CallbackPath = "/api/auth/microsoft-callback";
        options.SignInScheme = IdentityConstants.ExternalScheme;
        options.SaveTokens = true;
        options.Scope.Add("openid");
        options.Scope.Add("email");
        options.Scope.Add("profile");

        // Com proxy reverso, frontend e backend aparecem no mesmo domain para o browser
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;

        options.Events.OnRemoteFailure = context =>
        {
            var errorUrl = builder.Configuration["Authentication:ExternalErrorUrl"] ?? "http://localhost:4200/auth/external-error";
            context.Response.Redirect($"{errorUrl}?error=external_provider_error&message={Uri.EscapeDataString(context.Failure?.Message ?? "Authentication failed")}");
            context.HandleResponse();
            return Task.CompletedTask;
        };
    });
}

// ==============================================================================
// 3. RATE LIMITING (AspNetCoreRateLimit)
// ==============================================================================
// Proteção contra abusos limitando pedidos por IP.
// Configuração em appsettings.json: IpRateLimiting e IpRateLimitPolicies.
// Limites por endpoint:
// - POST /auth/login: 5 pedidos / 15 minutos
// - POST /auth/register: 3 pedidos / hora
// - POST /auth/refresh: 10 pedidos / minuto
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// ==============================================================================
// 4. SERVIÇOS DE EMAIL
// ==============================================================================
// Desenvolvimento: ConsoleEmailSender escreve para consola e armazena em memória
// Produção: SmtpEmailSender envia via SMTP (usar quando configurado)
// Configuração em appsettings.json: EmailOptions

builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("EmailOptions"));

// Registo condicional baseado no ambiente
if (builder.Environment.IsDevelopment())
{
    // DevEmailStore: armazena links de confirmação em memória para testes
    builder.Services.AddSingleton<IDevEmailStore, DevEmailStore>();
    // ConsoleEmailSender: escreve emails para consola (não envia realmente)
    builder.Services.AddScoped<IEmailSender, ConsoleEmailSender>();
}
else
{
    // Em produção, usar SmtpEmailSender para envio real de emails via SMTP2GO
    builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
}

builder.Services.AddScoped<TeamAutorizationService>();

// Serviço de geração e validação de tokens JWT
builder.Services.AddScoped<TokenService>();

// ==============================================================================
// 6. SERVIÇO DE IA (Google Gemini)
// ==============================================================================
// Free tier: 15 RPM, 1M tokens/dia com gemini-2.0-flash.
// Local: ApiKey lida de user-secrets (dotnet user-secrets set "Gemini:ApiKey" "...")
// Docker: ApiKey lida de variável de ambiente Gemini__ApiKey (definida no .env)
builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection("Gemini"));
builder.Services.AddHttpClient<IAIService, GeminiAIService>();

// ==============================================================================
// 7. STORAGE DE IMAGENS
// ==============================================================================
// Dev: guarda ficheiros localmente, servidos via UploadsController
// Prod: upload para Azure Blob Storage (connection string via env var)
builder.Services.Configure<BlobStorageOptions>(builder.Configuration.GetSection("BlobStorage"));

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<IStorageService, LocalStorageService>();
}
else
{
    builder.Services.AddScoped<IStorageService, BlobStorageService>();
}

// Serviço de extração de texto para ficheiros de contexto (PDF, TXT)
builder.Services.AddTransient<ITextExtractionService, TextExtractionService>();

// ==============================================================================
// 5. ASP.NET CORE IDENTITY
// ==============================================================================
// Sistema de gestão de utilizadores e autenticação.
// Configura políticas de password e requisitos de email.
// Integra com FluxnoteServerContext via Entity Framework.

builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    // Email único obrigatório para cada utilizador
    options.User.RequireUniqueEmail = true;

    // Política de password forte:
    // - Mínimo 8 caracteres
    // - Pelo menos 1 dígito
    // - Pelo menos 1 minúscula
    // - Pelo menos 1 maiúscula
    // - Pelo menos 1 caractere especial
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
})
.AddEntityFrameworkStores<FluxnoteServerContext>()
.AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = 403;
        return Task.CompletedTask;
    };
});

// Configurar External Scheme Cookie (usada durante OAuth flow)
// Com proxy reverso, frontend e backend aparecem no mesmo domain
builder.Services.ConfigureExternalCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.MaxDepth = 64;
    });

// Aumentar limite de tamanho do body para suportar uploads de imagens (5MB) e ficheiros de contexto (10MB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10MB
});
// Regista validadores FluentValidation do assembly
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
builder.Services.AddAuthorization();
builder.Services.AddAuthorization(options =>
{
    // Política para Owner (pode ser usado com [Authorize(Policy = "TeamOwner")])
    options.AddPolicy("TeamOwner", policy =>
    {
        // Esta política será verificada manualmente nos controllers
        // pois precisamos do teamId do contexto da requisição
        policy.RequireAuthenticatedUser();
    });
});

// ==============================================================================
// SIGNALR — Colaboração em tempo real (CRDT com Yjs)
// ==============================================================================
var signalRBuilder = builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 512 * 1024; // 512 KB por update Yjs
});

// Em produção, usar Azure SignalR Service para WebSockets (funciona no Free tier do App Service).
// Em dev (connection string não definida), usa WebSockets locais diretamente via Kestrel.
var azureSignalRConnection = builder.Configuration["AzureSignalR:ConnectionString"];
if (!string.IsNullOrEmpty(azureSignalRConnection))
    signalRBuilder.AddAzureSignalR(azureSignalRConnection);

// ==============================================================================
// 6. CORS (Cross-Origin Resource Sharing)
// ==============================================================================
// Permite pedidos do frontend Angular (localhost:4200).
// AllowCredentials: Necessário para cookies de refresh token.

var frontendUrl = builder.Configuration["Frontend:Url"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy =>
    {
        // Permite origens do frontend:
        // - Desenvolvimento: qualquer origem na porta 4200 ou 80 (LAN, localhost, etc.)
        // - Produção (Azure): URL configurada via Frontend:Url (env var Frontend__Url)
        policy.SetIsOriginAllowed(origin =>
               {
                   var uri = new Uri(origin);
                   // Dev: portas locais
                   if (uri.Port == 4200 || uri.Port == 80) return true;
                   // Prod: URL configurada (ex: https://fluxnote-frontend-app.azurewebsites.net)
                   if (!string.IsNullOrEmpty(frontendUrl))
                       return origin.TrimEnd('/') == frontendUrl.TrimEnd('/');
                   return false;
               })
               .WithHeaders("Content-Type", "Authorization", "X-Requested-With", "Upgrade", "Connection")
               .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
               // Expõe headers de rate limiting para o cliente
               .WithExposedHeaders("Retry-After", "X-Rate-Limit-Limit", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset")
               // Essencial para cookies de refresh token
               .AllowCredentials();
    });
});

// ==============================================================================
// 7. SWAGGER / OPENAPI
// ==============================================================================
// Documentação interativa da API disponível em /swagger em desenvolvimento.
// Inclui suporte para autenticação JWT Bearer.

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Fluxnote API",
        Version = "v1"
    });

    // Configurar autenticação JWT no Swagger
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Introduz o token JWT. Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ==============================================================================
// MIGRAÇÕES AUTOMÁTICAS
// ==============================================================================
// Aplica migrações pendentes ao iniciar (excepto em ambiente de testes).
// Garante que a base de dados está atualizada com o modelo de dados.

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<FluxnoteServerContext>();
    try
    {
        db.Database.Migrate();
        // SeedData.Initialize(services); // Descomente para dados iniciais
    }
    catch (SqliteException ex)
    {
        // SQLite pode falhar se tabelas já existem (cenários de teste).
        // Ignora erros "table already exists" para permitir reutilização de BD.
        if (ex.SqliteErrorCode == 1 && ex.Message?.Contains("already exists", StringComparison.OrdinalIgnoreCase) == true)
        {
            Console.WriteLine($"Ignored Sqlite migration error: {ex.Message}");
        }
        else
        {
            throw;
        }
    }
}

// ==============================================================================
// 8. PIPELINE DE MIDDLEWARE
// ==============================================================================
// Ordem dos middleware é importante!
// 1. Swagger (apenas desenvolvimento)
// 2. HTTPS Redirection (não em produção - handled por reverse proxy)
// 3. Routing
// 4. CORS
// 5. Rate Limiting
// 6. Authentication
// 7. Authorization
// 8. Controllers

// Forwarded Headers - necessário para Azure App Service (reverse proxy HTTPS -> HTTP)
// E para Nginx proxy no frontend (X-Forwarded-Host permite OAuth cookies funcionarem)
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor
                     | ForwardedHeaders.XForwardedProto
                     | ForwardedHeaders.XForwardedHost
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

// Swagger UI disponível em /swagger (apenas desenvolvimento)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS e página de erro detalhada (não em produção)
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
    app.UseDeveloperExceptionPage();
}

// Roteamento de pedidos
app.UseRouting();

// CORS deve vir antes de Authentication
app.UseCors("spa");

// Rate limiting por IP
app.UseIpRateLimiting();

// Autenticação JWT Bearer
app.UseAuthentication();

// Autorização baseada em políticas/claims
app.UseAuthorization();

// Mapeia controladores da API
app.MapControllers();

// Hub SignalR para colaboração em tempo real
app.MapHub<DocumentHub>("/hubs/document");

// Inicia a aplicação
app.Run();

// ==============================================================================
// Declaração parcial para suporte a testes de integração (WebApplicationFactory)
// ==============================================================================
public partial class Program { }
