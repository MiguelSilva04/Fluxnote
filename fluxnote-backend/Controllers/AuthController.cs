using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Auth;
using Fluxnote.Backend.Services.Email;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.MicrosoftAccount;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Fluxnote.Backend.Controllers;

/// <summary>
/// Controlador responsável pela autenticação e gestão de utilizadores.
/// Implementa registo, login, refresh de tokens, gestão de perfil e sessões.
/// </summary>
/// <remarks>
/// <b>Rota Base:</b> api/auth
///
/// <b>Endpoints Públicos (sem autenticação):</b>
/// <list type="table">
///     <listheader>
///         <term>Método</term>
///         <description>Rota e Descrição</description>
///     </listheader>
///     <item><term>POST</term><description>/register - Registo de novo utilizador (rate limit: 3/hora)</description></item>
///     <item><term>POST</term><description>/login - Autenticação (rate limit: 5/15min)</description></item>
///     <item><term>POST</term><description>/refresh - Renovação de access token (rate limit: 10/min)</description></item>
///     <item><term>POST</term><description>/logout - Terminar sessão atual</description></item>
///     <item><term>POST</term><description>/logout-all - Terminar todas as sessões</description></item>
///     <item><term>GET</term><description>/confirm-email - Confirmar endereço de email</description></item>
/// </list>
///
/// <b>Endpoints Autenticados (JWT obrigatório):</b>
/// <list type="table">
///     <listheader>
///         <term>Método</term>
///         <description>Rota e Descrição</description>
///     </listheader>
///     <item><term>GET</term><description>/users/me - Obter perfil do utilizador atual</description></item>
///     <item><term>GET</term><description>/users/check-username/{username} - Verificar disponibilidade de username</description></item>
///     <item><term>PUT</term><description>/users/me - Atualizar perfil</description></item>
///     <item><term>PUT</term><description>/users/me/password - Alterar password</description></item>
/// </list>
///
/// <b>Mecanismos de Segurança:</b>
/// <list type="bullet">
///     <item><description>JWT com expiração de 15 minutos (configurável)</description></item>
///     <item><description>Refresh token com rotação (token único por uso)</description></item>
///     <item><description>Deteção de reutilização de tokens (revoga sessão inteira)</description></item>
///     <item><description>Timeout de inatividade: 7 dias</description></item>
///     <item><description>Expiração absoluta: 7-30 dias (conforme RememberMe)</description></item>
///     <item><description>Rate limiting por IP em endpoints sensíveis</description></item>
///     <item><description>Bloqueio de conta após 5 tentativas falhadas em 15 minutos</description></item>
///     <item><description>Mensagens genéricas para prevenir enumeração de utilizadores</description></item>
/// </list>
/// </remarks>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly FluxnoteServerContext _db;
    private readonly TokenService _tokenService;
    private readonly IWebHostEnvironment _env;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    /// <summary>Duração padrão do access token em minutos.</summary>
    private const int AccessTokenMinutesDefault = 15;
    /// <summary>Dias de inatividade máxima antes de expirar sessão (sliding window).</summary>
    private const int RefreshSlidingDaysDefault = 7;
    /// <summary>Dias máximos absolutos de duração de sessão.</summary>
    private const int RefreshAbsoluteDaysDefault = 30;

    /// <summary>
    /// Construtor com injeção de dependências.
    /// </summary>
    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IEmailSender emailSender,
        IConfiguration configuration,
        FluxnoteServerContext db,
        TokenService tokenService,
        IWebHostEnvironment env
    )
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _emailSender = emailSender;
        _configuration = configuration;
        _db = db;
        _tokenService = tokenService;
        _env = env;
    }
    /// <summary>
    /// Regista um novo utilizador no sistema.
    /// </summary>
    /// <param name="request">Dados de registo: Email, Password, FullName.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Registo bem-sucedido, email de confirmação enviado.</item>
    ///     <item><b>400 Bad Request:</b> Validação falhou (password fraca, dados inválidos).</item>
    ///     <item><b>409 Conflict:</b> Email já registado no sistema.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Rate Limit:</b> 3 pedidos por hora por IP.<br/>
    /// <b>Fluxo:</b>
    /// <list type="number">
    ///     <item><description>Valida unicidade do email</description></item>
    ///     <item><description>Cria utilizador com AccountStatus.PendingEmailConfirmation</description></item>
    ///     <item><description>Gera token de confirmação de email</description></item>
    ///     <item><description>Envia email com link de confirmação</description></item>
    /// </list>
    /// <b>Requisitos de Password:</b>
    /// <list type="bullet">
    ///     <item><description>Mínimo 8 caracteres</description></item>
    ///     <item><description>1 letra maiúscula</description></item>
    ///     <item><description>1 letra minúscula</description></item>
    ///     <item><description>1 dígito</description></item>
    ///     <item><description>1 caractere especial</description></item>
    /// </list>
    /// </remarks>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
        {
            return Conflict(new
            {
                message = "Email is already registered."
            });
        }

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            ProfilePictureUrl = null,
            AuthProvider = AuthProvider.Local,
            AccountStatus = AccountStatus.PendingEmailConfirmation,
            EmailConfirmed = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new
            {
                message = "User creation failed.",
                errors = createResult.Errors.Select(e => e.Description)
            });
        }

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var tokenEncoded = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? _configuration["Frontend:Url"] ?? "http://localhost:4200";
        var confirmationLink =
            $"{frontendBaseUrl}/confirm-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(tokenEncoded)}";

        var lang = string.IsNullOrEmpty(request.Lang) ? "en" : request.Lang;
        await _emailSender.SendEmailConfirmationAsync(user.Email!, confirmationLink, lang);

        return Ok(new
        {
            message = "User registered successfully. Please check your email to confirm your account.",
            status = "PendingEmailConfirmation"
        });
    }


    /// <summary>
    /// Autentica um utilizador e inicia uma sessão.
    /// </summary>
    /// <param name="request">Credenciais: Email, Password, RememberMe (opcional).</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Login bem-sucedido. Retorna AccessToken e define cookie de refresh.</item>
    ///     <item><b>401 Unauthorized:</b> Credenciais inválidas (mensagem genérica por segurança).</item>
    ///     <item><b>403 Forbidden:</b> Conta não confirmada ou inativa.</item>
    ///     <item><b>423 Locked:</b> Conta bloqueada por excesso de tentativas falhadas.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Rate Limit:</b> 5 pedidos por 15 minutos por IP.<br/>
    /// <b>Política de Sessão (Sliding + Absolute):</b>
    /// <list type="bullet">
    ///     <item><description><b>IdleDays (7):</b> Sessão expira após X dias sem uso</description></item>
    ///     <item><description><b>AbsoluteDays:</b> 7 dias (normal) ou 30 dias (com RememberMe)</description></item>
    ///     <item><description>ExpiresAt = mínimo entre (LastUsedAt + IdleDays) e (SessionStartedAt + AbsoluteDays)</description></item>
    /// </list>
    /// <b>Resposta:</b>
    /// <code>
    /// {
    ///     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    ///     "expiresInSeconds": 900
    /// }
    /// </code>
    /// <b>Cookie:</b> fluxnote_rt (HttpOnly, Secure em produção, SameSite=Lax)<br/>
    /// <b>Bloqueio:</b> 5 tentativas falhadas em 15 minutos bloqueia a conta temporariamente.
    /// </remarks>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            // Não distinguir user inexistente de password errada
            return Unauthorized(new
            {
                message = "Invalid credentials.",
                errors = new[] { "Invalid email or password." }
            });
        }

        // Conta inválida -> 403
        var accountErrors = new List<string>();
        if (!user.EmailConfirmed) accountErrors.Add("Email not confirmed.");
        if (user.AccountStatus != AccountStatus.Active) accountErrors.Add($"Account status: {user.AccountStatus}.");

        if (accountErrors.Count > 0)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Account not allowed.",
                errors = accountErrors
            });
        }

        var signIn = await _signInManager.CheckPasswordSignInAsync(
            user,
            request.Password,
            lockoutOnFailure: true
        );

        if (!signIn.Succeeded)
        {
            if (signIn.IsLockedOut)
            {
                // Opcional: 423 é mais expressivo do que 403/401
                return StatusCode(StatusCodes.Status423Locked, new
                {
                    message = "Account locked.",
                    errors = new[] { "Too many failed attempts. Please try again later." }
                });
            }

            // Não dar sinais (401 genérico)
            return Unauthorized(new
            {
                message = "Invalid credentials.",
                errors = new[] { "Invalid email or password." }
            });
        }

        var accessToken = _tokenService.CreateAccessToken(user);

        // Refresh token session policy
        var now = DateTime.UtcNow;
        var idleDays = int.Parse(_configuration["Auth:RefreshIdleDays"] ?? "7"); // sliding window
        var absoluteDays = request.RememberMe
            ? int.Parse(_configuration["Auth:RefreshAbsoluteDaysRememberMe"] ?? "30")
            : int.Parse(_configuration["Auth:RefreshAbsoluteDays"] ?? "7"); // sem rememberMe

        var sessionId = Guid.NewGuid().ToString();
        var sessionStartedAt = now;
        var absoluteExpiresAt = sessionStartedAt.AddDays(absoluteDays);
        var expiresAt = Min(now.AddDays(idleDays), absoluteExpiresAt);

        var refreshPlain = TokenService.GenerateRefreshTokenPlain();
        var refreshHash = TokenService.HashRefreshToken(refreshPlain);

        _db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = refreshHash,
            UserId = user.Id,
            SessionId = sessionId,
            SessionStartedAt = sessionStartedAt,
            LastUsedAt = now,
            ExpiresAt = expiresAt,
            // Persistir a política por sessão (recomendado para consistência)
            AbsoluteDays = absoluteDays,
            IdleDays = idleDays,
            CreatedAt = now,
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        });

        await _db.SaveChangesAsync();

        SetRefreshCookie(refreshPlain, expiresAt);

        var accessMinutes = int.Parse(_configuration["Jwt:AccessTokenMinutes"] ?? "15");
        return Ok(new
        {
            accessToken,
            expiresInSeconds = accessMinutes * 60
        });
    }

    /// <summary>
    /// Inicia o fluxo OAuth para um provider externo (Google/Microsoft).
    /// </summary>
    /// <param name="provider">Provider externo: <c>google</c> ou <c>microsoft</c>.</param>
    /// <param name="returnUrl">Rota opcional do frontend para onde redirecionar após login.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>302 Redirect:</b> Redireciona para a página de consentimento do provider.</item>
    ///     <item><b>400 Bad Request:</b> Provider inválido.</item>
    /// </list>
    /// </returns>
    [HttpGet("external-login/{provider}")]
    [AllowAnonymous]
    public async Task<IActionResult> ExternalLogin(string provider, [FromQuery] string? returnUrl = null)
    {
        var authScheme = ResolveAuthScheme(provider);
        if (authScheme is null)
        {
            return BadRequest(new
            {
                error = "Provider not supported.",
                supportedProviders = new[] { "google", "microsoft" }
            });
        }

        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
        var redirectUrl = Url.Action(nameof(ExternalLoginCallback), "Auth", new { returnUrl });
        var properties = _signInManager.ConfigureExternalAuthenticationProperties(authScheme, redirectUrl!);
        return Challenge(properties, authScheme);
    }

    /// <summary>
    /// Callback OAuth chamado pelo provider após autenticação externa.
    /// </summary>
    /// <param name="returnUrl">Rota opcional para redirecionamento no frontend.</param>
    /// <param name="remoteError">Erro retornado pelo provider (se existir).</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>302 Redirect:</b> Para callback/error page do frontend.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// Fluxo principal:
    /// <list type="number">
    ///     <item><description>Lê claims do provider externo.</description></item>
    ///     <item><description>Faz sign-in de login externo existente, ou vincula por email, ou cria conta nova.</description></item>
    ///     <item><description>Gera access token + refresh cookie e redireciona para o frontend.</description></item>
    /// </list>
    /// </remarks>
    [HttpGet("external-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> ExternalLoginCallback([FromQuery] string? returnUrl = null, [FromQuery] string? remoteError = null)
    {
        var frontendCallbackUrl = _configuration["Authentication:ExternalCallbackUrl"] ?? "http://localhost:4200/auth/external-callback";
        var frontendErrorUrl = _configuration["Authentication:ExternalErrorUrl"] ?? "http://localhost:4200/auth/external-error";

        if (!string.IsNullOrWhiteSpace(remoteError))
        {
            return RedirectExternalError(frontendErrorUrl, "external_provider_error", remoteError);
        }

        var info = await _signInManager.GetExternalLoginInfoAsync();
        if (info is null)
        {
            return RedirectExternalError(frontendErrorUrl, "external_login_failed");
        }

        var email = info.Principal.FindFirstValue(ClaimTypes.Email) ?? info.Principal.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email))
        {
            return RedirectExternalError(frontendErrorUrl, "email_not_provided");
        }

        var fullName = info.Principal.FindFirstValue(ClaimTypes.Name);
        var profilePicture = ExtractProfilePicture(info.Principal);
        var authProvider = ResolveAuthProvider(info.LoginProvider);

        var signInResult = await _signInManager.ExternalLoginSignInAsync(
            info.LoginProvider,
            info.ProviderKey,
            isPersistent: false,
            bypassTwoFactor: true);

        User? user;

        if (signInResult.Succeeded)
        {
            user = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
            if (user is null)
            {
                return RedirectExternalError(frontendErrorUrl, "external_login_failed");
            }
        }
        else
        {
            user = await _userManager.FindByEmailAsync(email);

            if (user is not null)
            {
                var addLoginResult = await _userManager.AddLoginAsync(user, info);
                if (!addLoginResult.Succeeded)
                {
                    var errors = string.Join(", ", addLoginResult.Errors.Select(e => e.Description));
                    return RedirectExternalError(frontendErrorUrl, "link_external_failed", errors);
                }
            }
            else
            {
                user = new User
                {
                    UserName = await GenerateUniqueUsernameAsync(email),
                    Email = email,
                    FullName = fullName,
                    ProfilePictureUrl = profilePicture,
                    EmailConfirmed = true,
                    AccountStatus = AccountStatus.Active,
                    AuthProvider = authProvider,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    return RedirectExternalError(frontendErrorUrl, "create_user_failed", errors);
                }

                var addLoginResult = await _userManager.AddLoginAsync(user, info);
                if (!addLoginResult.Succeeded)
                {
                    await _userManager.DeleteAsync(user);
                    var errors = string.Join(", ", addLoginResult.Errors.Select(e => e.Description));
                    return RedirectExternalError(frontendErrorUrl, "link_external_failed", errors);
                }
            }
        }

        if (!user.EmailConfirmed || user.AccountStatus == AccountStatus.PendingEmailConfirmation)
        {
            user.EmailConfirmed = true;
            user.AccountStatus = AccountStatus.Active;
            user.UpdatedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);
        }

        if (user.AccountStatus is AccountStatus.Suspended or AccountStatus.Blocked)
        {
            return RedirectExternalError(frontendErrorUrl, "account_not_active");
        }

        if (!string.IsNullOrWhiteSpace(fullName) && string.IsNullOrWhiteSpace(user.FullName))
        {
            user.FullName = fullName;
        }
        if (!string.IsNullOrWhiteSpace(profilePicture) && string.IsNullOrWhiteSpace(user.ProfilePictureUrl))
        {
            user.ProfilePictureUrl = profilePicture;
        }
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var accessToken = _tokenService.CreateAccessToken(user);

        var now = DateTime.UtcNow;
        var idleDays = int.Parse(_configuration["Auth:RefreshIdleDays"] ?? "7");
        var absoluteDays = int.Parse(_configuration["Auth:RefreshAbsoluteDaysRememberMe"] ?? "30");
        var sessionStartedAt = now;
        var absoluteExpiresAt = sessionStartedAt.AddDays(absoluteDays);
        var expiresAt = Min(now.AddDays(idleDays), absoluteExpiresAt);

        var refreshPlain = TokenService.GenerateRefreshTokenPlain();
        var refreshHash = TokenService.HashRefreshToken(refreshPlain);

        _db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = refreshHash,
            UserId = user.Id,
            SessionId = Guid.NewGuid().ToString(),
            SessionStartedAt = sessionStartedAt,
            LastUsedAt = now,
            ExpiresAt = expiresAt,
            AbsoluteDays = absoluteDays,
            IdleDays = idleDays,
            CreatedAt = now,
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        });

        await _db.SaveChangesAsync();
        SetRefreshCookie(refreshPlain, expiresAt);

        var fragmentParams = new Dictionary<string, string?>
        {
            ["access_token"] = accessToken
        };

        if (!string.IsNullOrWhiteSpace(returnUrl))
        {
            fragmentParams["returnUrl"] = returnUrl;
        }

        var fragment = (QueryString.Create(fragmentParams).Value ?? string.Empty).TrimStart('?');
        return Redirect($"{frontendCallbackUrl}#{fragment}");
    }

    /// <summary>
    /// Obtém os providers externos ligados à conta autenticada.
    /// </summary>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Providers ligados e disponíveis.</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
    /// </list>
    /// </returns>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpGet("external-logins")]
    public async Task<IActionResult> GetExternalLogins()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid claims for obtaining user id." });
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return Unauthorized(new { message = "User not found." });
        }

        var logins = await _userManager.GetLoginsAsync(user);
        var linkedProviders = logins.Select(l => new
        {
            provider = l.LoginProvider,
            providerDisplayName = l.ProviderDisplayName,
            providerKey = l.ProviderKey
        });

        var availableProviders = new[] { "Google", "Microsoft" }
            .Where(p => !logins.Any(l => l.LoginProvider.Equals(p, StringComparison.OrdinalIgnoreCase)));

        var hasPassword = await _userManager.HasPasswordAsync(user);
        var unlinkLastExternalDeletesAccount =
            !hasPassword &&
            logins.Count == 1 &&
            user.AuthProvider != AuthProvider.Local;

        return Ok(new
        {
            linkedProviders,
            availableProviders,
            hasPassword,
            unlinkLastExternalDeletesAccount
        });
    }

    /// <summary>
    /// Inicia o fluxo de vinculação de um provider externo à conta atual.
    /// </summary>
    /// <param name="provider">Provider externo: <c>google</c> ou <c>microsoft</c>.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>302 Redirect:</b> Para challenge OAuth do provider.</item>
    ///     <item><b>400 Bad Request:</b> Provider inválido.</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
    /// </list>
    /// </returns>
    [AllowAnonymous]
    [HttpGet("link-external/{provider}")]
    [HttpPost("link-external/{provider}")]
    public async Task<IActionResult> LinkExternalLogin(string provider, [FromQuery] string? accessToken = null, [FromQuery] string? returnUrl = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ExtractUserIdFromAccessToken(accessToken);
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid claims for obtaining user id." });
        }

        var authScheme = ResolveAuthScheme(provider);
        if (authScheme is null)
        {
            return BadRequest(new { error = "Provider not supported." });
        }

        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
        var redirectUrl = Url.Action(nameof(LinkExternalLoginCallback), "Auth", new { linkUserId = userId, returnUrl });
        var properties = _signInManager.ConfigureExternalAuthenticationProperties(authScheme, redirectUrl!, userId);
        return Challenge(properties, authScheme);
    }

    /// <summary>
    /// Callback do fluxo de vinculação de provider externo.
    /// </summary>
    /// <param name="linkUserId">ID do utilizador para concluir a ligação.</param>
    /// <param name="remoteError">Erro retornado pelo provider (se existir).</param>
    /// <returns>Redireciona para callback/error page do frontend.</returns>
    [HttpGet("link-external-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> LinkExternalLoginCallback([FromQuery] string? linkUserId = null, [FromQuery] string? returnUrl = null, [FromQuery] string? remoteError = null)
    {
        var frontendCallbackUrl = _configuration["Authentication:ExternalCallbackUrl"] ?? "http://localhost:4200/auth/external-callback";
        var frontendErrorUrl = _configuration["Authentication:ExternalErrorUrl"] ?? "http://localhost:4200/auth/external-error";

        if (!string.IsNullOrWhiteSpace(remoteError))
        {
            return RedirectExternalError(frontendErrorUrl, "external_provider_error", remoteError);
        }

        if (string.IsNullOrWhiteSpace(linkUserId))
        {
            return RedirectExternalError(frontendErrorUrl, "unauthorized");
        }

        var user = await _userManager.FindByIdAsync(linkUserId);
        if (user is null)
        {
            return RedirectExternalError(frontendErrorUrl, "unauthorized");
        }

        var info = await _signInManager.GetExternalLoginInfoAsync(linkUserId);
        if (info is null)
        {
            return RedirectExternalError(frontendErrorUrl, "external_login_failed");
        }

        var existingUser = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
        if (existingUser is not null && existingUser.Id != user.Id)
        {
            return RedirectExternalError(
                frontendErrorUrl,
                "provider_already_linked",
                "Esta conta Google ja esta ligada a outro utilizador. Use outra conta Google ou inicie sessao nessa conta.");
        }

        var result = await _userManager.AddLoginAsync(user, info);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return RedirectExternalError(frontendErrorUrl, "link_external_failed", errors);
        }

        var fragmentParams = new Dictionary<string, string?>
        {
            ["linked"] = info.LoginProvider.ToLowerInvariant()
        };

        if (!string.IsNullOrWhiteSpace(returnUrl))
        {
            fragmentParams["returnUrl"] = returnUrl;
        }

        var fragment = (QueryString.Create(fragmentParams).Value ?? string.Empty).TrimStart('?');
        return Redirect($"{frontendCallbackUrl}#{fragment}");
    }

    /// <summary>
    /// Remove a vinculação de um provider externo da conta autenticada.
    /// </summary>
    /// <param name="provider">Provider a remover.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Provider removido.</item>
    ///     <item><b>400 Bad Request:</b> Tentativa de remover último método de autenticação.</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
    ///     <item><b>404 Not Found:</b> Provider não está ligado.</item>
    /// </list>
    /// </returns>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpDelete("unlink-external/{provider}")]
    public async Task<IActionResult> UnlinkExternalLogin(string provider)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid claims for obtaining user id." });
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return Unauthorized(new { message = "User not found." });
        }

        var hasPassword = await _userManager.HasPasswordAsync(user);
        var logins = await _userManager.GetLoginsAsync(user);

        var login = logins.FirstOrDefault(l =>
            l.LoginProvider.Equals(provider, StringComparison.OrdinalIgnoreCase));

        if (login is null)
        {
            return NotFound(new { error = "Provider is not linked to this account." });
        }

        var isOnlyLoginMethod = !hasPassword && logins.Count == 1;
        var shouldDeleteAccountOnUnlink = isOnlyLoginMethod && user.AuthProvider != AuthProvider.Local;

        // If this is an OAuth-only account and this is the only auth method, unlinking removes account by design.
        if (shouldDeleteAccountOnUnlink)
        {
            var userRefreshTokens = await _db.RefreshTokens
                .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
                .ToListAsync();

            var now = DateTime.UtcNow;
            foreach (var token in userRefreshTokens)
            {
                token.RevokedAt = now;
            }

            var deleteResult = await _userManager.DeleteAsync(user);
            if (deleteResult.Succeeded)
            {
                await _db.SaveChangesAsync();
                ClearRefreshCookie();

                return Ok(new
                {
                    message = "External provider unlinked and account deleted because it was the only login method.",
                    accountDeleted = true
                });
            }

            // Fallback for users with related data (e.g., created documents with restrict-delete FK):
            // perform logical deletion and unlink external provider.
            var removeLoginResult = await _userManager.RemoveLoginAsync(user, login.LoginProvider, login.ProviderKey);
            if (!removeLoginResult.Succeeded)
            {
                return BadRequest(new { errors = removeLoginResult.Errors.Select(e => e.Description) });
            }

            var deletedSuffix = Guid.NewGuid().ToString("N")[..12];
            user.UserName = $"deleted_{deletedSuffix}";
            user.Email = $"deleted_{deletedSuffix}@deleted.local";
            user.FullName = "Deleted User";
            user.ProfilePictureUrl = null;
            user.PhoneNumber = null;
            user.Bio = null;
            user.Timezone = null;
            user.Location = null;
            user.EmailConfirmed = false;
            user.AccountStatus = AccountStatus.Blocked;
            user.LockoutEnabled = true;
            user.LockoutEnd = DateTimeOffset.MaxValue;
            user.UpdatedAt = DateTime.UtcNow;

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return BadRequest(new { errors = updateResult.Errors.Select(e => e.Description) });
            }

            await _db.SaveChangesAsync();
            ClearRefreshCookie();

            return Ok(new
            {
                message = "External provider unlinked and account logically deleted because it was the only login method.",
                accountDeleted = true
            });
        }

        // Defensive guard: local accounts should never end up with zero login methods.
        if (isOnlyLoginMethod)
        {
            return BadRequest(new
            {
                error = "Cannot unlink the only login method.",
                message = "Set a password before disconnecting this external provider."
            });
        }

        var result = await _userManager.RemoveLoginAsync(user, login.LoginProvider, login.ProviderKey);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        return Ok(new
        {
            message = $"Provider {provider} unlinked successfully.",
            accountDeleted = false
        });
    }

    /// <summary>
    /// Obtém o perfil completo do utilizador autenticado.
    /// </summary>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Perfil do utilizador (UserProfile).</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido ou expirado.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Autenticação:</b> JWT Bearer obrigatório.<br/>
    /// <b>Resposta (UserProfile):</b>
    /// <code>
    /// {
    ///     "id": "guid",
    ///     "email": "user@example.com",
    ///     "fullName": "Nome Completo",
    ///     "userName": "username",
    ///     "profilePictureUrl": "https://...",
    ///     "location": "Lisboa, Portugal",
    ///     "phoneNumber": "+351...",
    ///     "bio": "Descrição",
    ///     "timezone": "Europe/Lisbon",
    ///     "createdAt": "2024-01-01T00:00:00Z",
    ///     "usernameChangesRemaining": 3
    /// }
    /// </code>
    /// </remarks>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpGet("users/me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized("Invalid claims for obtaining user id.");

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return Unauthorized(new
            {
                message = "User not found."
            });
        }

        var usernameChangesRemaining = CalculateUsernameChangesRemaining(user);

        var profile = new UserProfile
        {
            Id = user.Id,
            Email = user.Email!,
            FullName = user.FullName!,
            UserName = user.UserName!,
            ProfilePictureUrl = user.ProfilePictureUrl!,
            Location = user.Location!,
            PhoneNumber = user.PhoneNumber!,
            Bio = user.Bio,
            Timezone = user.Timezone,
            CreatedAt = user.CreatedAt,
            UsernameChangesRemaining = usernameChangesRemaining
        };
        return Ok(profile);
    }

    /// <summary>
    /// Verifica se um username está disponível para uso.
    /// </summary>
    /// <param name="username">Username a verificar (3-30 caracteres, alfanumérico + underscore).</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> { available: true/false, message: "..." }</item>
    ///     <item><b>400 Bad Request:</b> Formato de username inválido.</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Autenticação:</b> JWT Bearer obrigatório.<br/>
    /// <b>Validações:</b>
    /// <list type="bullet">
    ///     <item><description>3-30 caracteres de comprimento</description></item>
    ///     <item><description>Apenas letras, números e underscore (_)</description></item>
    ///     <item><description>Não pode estar em uso por outro utilizador</description></item>
    /// </list>
    /// </remarks>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpGet("users/check-username/{username}")]
    public async Task<IActionResult> CheckUsernameAvailability(string username)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized(new { message = "Invalid claims." });

        // Validate username format
        if (string.IsNullOrWhiteSpace(username) || username.Length < 3 || username.Length > 30)
        {
            return BadRequest(new { available = false, message = "Username must be between 3 and 30 characters." });
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(username, @"^[a-zA-Z0-9_@]+$"))
        {
            return BadRequest(new { available = false, message = "Username can only contain letters, numbers, @, and underscores." });
        }

        // Check if username is taken by another user
        var existingUser = await _userManager.FindByNameAsync(username);
        var isAvailable = existingUser is null || existingUser.Id == userId;

        return Ok(new { available = isAvailable, message = isAvailable ? "Username is available." : "Username is already taken." });
    }

    private int CalculateUsernameChangesRemaining(User user)
    {
        const int maxChangesPerMonth = 3;
        var now = DateTime.UtcNow;

        // Reset counter if we're in a new month
        if (user.LastUsernameChangeReset is null ||
            user.LastUsernameChangeReset.Value.Year != now.Year ||
            user.LastUsernameChangeReset.Value.Month != now.Month)
        {
            return maxChangesPerMonth;
        }

        return Math.Max(0, maxChangesPerMonth - user.UsernameChangesThisMonth);
    }

    /// <summary>
    /// Atualiza o perfil do utilizador autenticado.
    /// </summary>
    /// <param name="request">Campos a atualizar (todos opcionais).</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Perfil atualizado (UserProfile).</item>
    ///     <item><b>400 Bad Request:</b> Limite de alterações de username atingido ou username já em uso.</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Autenticação:</b> JWT Bearer obrigatório.<br/>
    /// <b>Campos Atualizáveis:</b>
    /// <list type="bullet">
    ///     <item><description>FullName - Nome completo</description></item>
    ///     <item><description>ProfilePictureUrl - URL da foto de perfil</description></item>
    ///     <item><description>Location - Localização</description></item>
    ///     <item><description>PhoneNumber - Número de telefone</description></item>
    ///     <item><description>UserName - Username (máx. 3 alterações/mês)</description></item>
    ///     <item><description>Bio - Biografia</description></item>
    ///     <item><description>Timezone - Fuso horário</description></item>
    /// </list>
    /// <b>Limite de Username:</b> Máximo 3 alterações por mês. Contador reseta automaticamente.
    /// </remarks>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpPut("users/me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized(new { message = "Invalid claims for obtaining user id." });

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return Unauthorized(new { message = "User not found." });

        var now = DateTime.UtcNow;

        // Handle username change with 3/month limit
        if (request.UserName is not null && request.UserName != user.UserName)
        {
            // Reset counter if we're in a new month
            if (user.LastUsernameChangeReset is null ||
                user.LastUsernameChangeReset.Value.Year != now.Year ||
                user.LastUsernameChangeReset.Value.Month != now.Month)
            {
                user.UsernameChangesThisMonth = 0;
                user.LastUsernameChangeReset = now;
            }

            // Check if user has remaining changes
            if (user.UsernameChangesThisMonth >= 3)
            {
                return BadRequest(new
                {
                    message = "Username change limit reached.",
                    errors = new[] { "You can only change your username 3 times per month. Please try again next month." }
                });
            }

            // Check if username is already taken
            var existingUser = await _userManager.FindByNameAsync(request.UserName);
            if (existingUser is not null && existingUser.Id != userId)
            {
                return BadRequest(new
                {
                    message = "Username already taken.",
                    errors = new[] { "This username is already in use. Please choose a different one." }
                });
            }

            user.UserName = request.UserName;
            user.UsernameChangesThisMonth++;
        }

        // atualiza apenas os campos passados no request
        if (request.FullName is not null)
            user.FullName = request.FullName;

        if (request.ProfilePictureUrl is not null)
            user.ProfilePictureUrl = request.ProfilePictureUrl;

        if (request.Location is not null)
            user.Location = request.Location;

        if (request.PhoneNumber is not null)
            user.PhoneNumber = request.PhoneNumber;

        if (request.Bio is not null)
            user.Bio = request.Bio;

        if (request.Timezone is not null)
            user.Timezone = request.Timezone;

        user.UpdatedAt = now;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Failed to update profile.",
                errors = result.Errors.Select(e => e.Description)
            });
        }

        var usernameChangesRemaining = CalculateUsernameChangesRemaining(user);

        var profile = new UserProfile
        {
            Id = user.Id,
            Email = user.Email!,
            FullName = user.FullName!,
            UserName = user.UserName!,
            ProfilePictureUrl = user.ProfilePictureUrl!,
            Location = user.Location!,
            PhoneNumber = user.PhoneNumber!,
            Bio = user.Bio,
            Timezone = user.Timezone,
            CreatedAt = user.CreatedAt,
            UsernameChangesRemaining = usernameChangesRemaining
        };

        return Ok(profile);
    }

    /// <summary>
    /// Altera a password do utilizador autenticado.
    /// </summary>
    /// <param name="request">CurrentPassword, NewPassword, ConfirmPassword.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Password alterada com sucesso.</item>
    ///     <item><b>400 Bad Request:</b> Password atual incorreta, nova password não cumpre requisitos, ou conta OAuth.</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Autenticação:</b> JWT Bearer obrigatório.<br/>
    /// <b>Restrições:</b>
    /// <list type="bullet">
    ///     <item><description>Apenas disponível para contas com AuthProvider.Local</description></item>
    ///     <item><description>Requer password atual correta para segurança</description></item>
    ///     <item><description>Nova password deve cumprir requisitos do Identity</description></item>
    /// </list>
    /// <b>Requisitos de Password:</b>
    /// <list type="bullet">
    ///     <item><description>Mínimo 8 caracteres</description></item>
    ///     <item><description>1 letra maiúscula, 1 minúscula, 1 dígito, 1 especial</description></item>
    /// </list>
    /// </remarks>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpPut("users/me/password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized(new { message = "Invalid claims for obtaining user id." });

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return Unauthorized(new { message = "User not found." });

        var hasPassword = await _userManager.HasPasswordAsync(user);
        if (!hasPassword)
        {
            return BadRequest(new
            {
                message = "Cannot change password.",
                errors = new[] { "This account does not have a password yet. Use /api/auth/set-password first." }
            });
        }

        // valida a password atual
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.CurrentPassword);
        if (!passwordValid)
        {
            return BadRequest(new
            {
                message = "Invalid current password.",
                errors = new[] { "The current password is incorrect." }
            });
        }

        // altera a password usando o Identity (aplica todas as validações configuradas)
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Failed to change password.",
                errors = result.Errors.Select(e => e.Description)
            });
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return Ok(new { message = "Password changed successfully." });
    }

    /// <summary>
    /// Define password para utilizadores que só tinham login externo (sem password local).
    /// </summary>
    /// <param name="request">Nova password.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Password definida com sucesso.</item>
    ///     <item><b>400 Bad Request:</b> Utilizador já possui password ou password inválida.</item>
    ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
    /// </list>
    /// </returns>
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
            return Unauthorized(new { message = "Invalid claims for obtaining user id." });

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return Unauthorized(new { message = "User not found." });

        if (await _userManager.HasPasswordAsync(user))
        {
            return BadRequest(new
            {
                message = "User already has a password. Use /api/auth/users/me/password instead."
            });
        }

        var result = await _userManager.AddPasswordAsync(user, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return Ok(new { message = "Password set successfully." });
    }

    /// <summary>
    /// Renova o access token usando o refresh token do cookie.
    /// </summary>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Novo access token e refresh token rotacionado.</item>
    ///     <item><b>401 Unauthorized:</b> Sem cookie, token inválido/expirado/revogado, ou reutilização detetada.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Rate Limit:</b> 10 pedidos por minuto por IP.<br/>
    /// <b>Mecanismo de Rotação:</b>
    /// <list type="number">
    ///     <item><description>Valida refresh token do cookie</description></item>
    ///     <item><description>Verifica se não está revogado, expirado, ou em idle timeout</description></item>
    ///     <item><description>Revoga token atual</description></item>
    ///     <item><description>Gera novo refresh token</description></item>
    ///     <item><description>Calcula nova expiração: min(agora+idleDays, sessionStart+absoluteDays)</description></item>
    ///     <item><description>Define novo cookie</description></item>
    ///     <item><description>Retorna novo access token</description></item>
    /// </list>
    /// <b>Deteção de Reutilização:</b><br/>
    /// Se um token já revogado for usado novamente, toda a sessão é revogada por segurança
    /// (indica possível roubo de token).<br/>
    /// <b>Verificações Adicionais:</b>
    /// <list type="bullet">
    ///     <item><description>Email deve estar confirmado</description></item>
    ///     <item><description>AccountStatus deve ser Active</description></item>
    ///     <item><description>Timeout de inatividade (idleDays)</description></item>
    ///     <item><description>Expiração absoluta (absoluteDays desde início da sessão)</description></item>
    /// </list>
    /// </remarks>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var cookieName = _configuration["Auth:RefreshCookieName"] ?? "fluxnote_rt";
        if (!Request.Cookies.TryGetValue(cookieName, out var refreshPlain) || string.IsNullOrWhiteSpace(refreshPlain))
        {
            ClearRefreshCookie();
            return Unauthorized(new { message = "Not authenticated." });
        }

        var now = DateTime.UtcNow;
        var refreshHash = TokenService.HashRefreshToken(refreshPlain);

        var stored = await _db.RefreshTokens
            .AsTracking()
            .FirstOrDefaultAsync(rt => rt.TokenHash == refreshHash);

        if (stored is null)
        {
            ClearRefreshCookie();
            return Unauthorized(new { message = "Not authenticated." });
        }

        // Reuse detection: token revogado reapareceu
        if (stored.RevokedAt is not null)
        {
            await RevokeSessionAsync(stored.UserId, stored.SessionId, now);
            ClearRefreshCookie();
            return Unauthorized(new { message = "Not authenticated." });
        }

        // Expiração total do token actual
        if (stored.ExpiresAt <= now)
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Unauthorized(new { message = "Not authenticated." });
        }

        // Política por sessão (respeita rememberMe)
        var idleDays = stored.IdleDays ?? int.Parse(_configuration["Auth:RefreshIdleDays"] ?? "7");
        var absoluteDays = stored.AbsoluteDays ?? int.Parse(_configuration["Auth:RefreshAbsoluteDaysRememberMe"] ?? "30");

        var absoluteExpiresAt = stored.SessionStartedAt.AddDays(absoluteDays);

        // Absolute cap
        if (now >= absoluteExpiresAt)
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Unauthorized(new { message = "Not authenticated." });
        }

        // Idle timeout
        if (now - stored.LastUsedAt > TimeSpan.FromDays(idleDays))
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Unauthorized(new { message = "Not authenticated." });
        }

        // User checks
        var user = await _userManager.FindByIdAsync(stored.UserId);
        if (user is null || !user.EmailConfirmed || user.AccountStatus != AccountStatus.Active)
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Unauthorized(new { message = "Not authenticated." });
        }

        // Rotação
        var newRefreshPlain = TokenService.GenerateRefreshTokenPlain();
        var newRefreshHash = TokenService.HashRefreshToken(newRefreshPlain);

        stored.RevokedAt = now;
        stored.ReplacedByTokenHash = newRefreshHash;

        var newExpiresAt = Min(now.AddDays(idleDays), absoluteExpiresAt);

        _db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = newRefreshHash,
            UserId = stored.UserId,
            SessionId = stored.SessionId,
            SessionStartedAt = stored.SessionStartedAt,
            LastUsedAt = now,
            ExpiresAt = newExpiresAt,
            AbsoluteDays = absoluteDays,
            IdleDays = idleDays,
            CreatedAt = now,
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        });

        await _db.SaveChangesAsync();

        SetRefreshCookie(newRefreshPlain, newExpiresAt);

        var accessToken = _tokenService.CreateAccessToken(user);
        var accessMinutes = int.Parse(_configuration["Jwt:AccessTokenMinutes"] ?? "15");

        return Ok(new
        {
            accessToken,
            expiresInSeconds = accessMinutes * 60
        });
    }

    /// <summary>
    /// Confirma o endereço de email de um utilizador.
    /// </summary>
    /// <param name="userId">ID do utilizador (recebido no link de confirmação).</param>
    /// <param name="token">Token de confirmação codificado em Base64Url.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Email confirmado com sucesso. Conta ativada.</item>
    ///     <item><b>409 Conflict:</b> UserID inválido, token inválido, ou confirmação falhou.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>Fluxo:</b>
    /// <list type="number">
    ///     <item><description>Valida existência do utilizador</description></item>
    ///     <item><description>Verifica se email já foi confirmado</description></item>
    ///     <item><description>Descodifica token de Base64Url</description></item>
    ///     <item><description>Confirma email via Identity</description></item>
    ///     <item><description>Atualiza AccountStatus para Active</description></item>
    /// </list>
    /// <b>Nota:</b> Este endpoint é chamado pelo frontend quando o utilizador clica no link do email.
    /// </remarks>
    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string userId, [FromQuery] string token)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return Conflict(
                new
                {
                    message = "Invalid user ID."
                });
        }
        if (user.EmailConfirmed)
        {
            return Ok(
                new
                {
                    message = "Email already confirmed. You can proceed to login."
                });
        }
        string tokenDecoded;
        try
        {
            var tokenBytes = WebEncoders.Base64UrlDecode(token);
            tokenDecoded = Encoding.UTF8.GetString(tokenBytes);
        }
        catch
        {
            return Conflict(
                new
                {
                    message = "Invalid token format."
                });
        }
        // decodificar o token
        var result = await _userManager.ConfirmEmailAsync(user, tokenDecoded);
        if (!result.Succeeded)
        {
            return Conflict(
                new
                {
                    message = "Email confirmation failed.",
                    errors = result.Errors.Select(e => e.Description)
                });
        }
        // atualiza o estado da conta
        user.AccountStatus = AccountStatus.Active;
        user.UpdatedAt = DateTime.UtcNow;
        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return StatusCode(500, new
            {
                message = "Email confirmed, but failed to update account status.",
                Errors = updateResult.Errors.Select(e => e.Description)
            });
        }

        // devolver resposta de sucesso e rederionar para login
        return Ok(
            new
            {
                message = "Email confirmed successfully. You can now log in.",
                status = "Active"
            });
    }

    /// <summary>
    /// [DESENVOLVIMENTO] Obtém o último link de confirmação enviado para um email.
    /// </summary>
    /// <param name="email">Email para consultar.</param>
    /// <param name="store">Serviço de armazenamento de emails de dev.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Link de confirmação encontrado.</item>
    ///     <item><b>404 Not Found:</b> Endpoint não disponível em produção ou link não encontrado.</item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// <b>⚠️ APENAS DISPONÍVEL EM AMBIENTE DE DESENVOLVIMENTO</b><br/>
    /// Útil para testes automatizados e debug do fluxo de confirmação de email.
    /// </remarks>
    [HttpGet("dev/last-confirmation-link")]
    public IActionResult DevLastConfirmationLink([FromQuery] string email, [FromServices] IDevEmailStore store)
    {
        if (!HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            return NotFound();

        var link = store.Get(email);
        if (link is null) return NotFound(new { message = "No link found for this email." });

        return Ok(new { confirmationLink = link });
    }

    /// <summary>
    /// Termina a sessão atual do utilizador.
    /// </summary>
    /// <returns><b>200 OK:</b> Logout bem-sucedido. Cookie removido.</returns>
    /// <remarks>
    /// Revoga apenas o refresh token da sessão atual.<br/>
    /// Outras sessões do utilizador permanecem ativas.
    /// </remarks>
    [HttpPost("logout")]
    public Task<IActionResult> Logout() => LogoutCore(revokeAll: false);

    /// <summary>
    /// Termina todas as sessões do utilizador.
    /// </summary>
    /// <returns><b>200 OK:</b> Logout de todas as sessões bem-sucedido.</returns>
    /// <remarks>
    /// Revoga todos os refresh tokens ativos do utilizador.<br/>
    /// Força re-autenticação em todos os dispositivos.<br/>
    /// Útil em caso de suspeita de comprometimento de conta.
    /// </remarks>
    [HttpPost("logout-all")]
    public Task<IActionResult> LogoutAll() => LogoutCore(revokeAll: true);

    /// <summary>
    /// Lógica comum para logout (sessão única ou todas).
    /// </summary>
    /// <param name="revokeAll">True para revogar todas as sessões, false para apenas a atual.</param>
    private async Task<IActionResult> LogoutCore(bool revokeAll)
    {
        var cookieName = _configuration["Auth:RefreshCookieName"] ?? "fluxnote_rt";

        if (!Request.Cookies.TryGetValue(cookieName, out var refreshPlain) || string.IsNullOrWhiteSpace(refreshPlain))
        {
            ClearRefreshCookie();
            return Ok(new { message = "Logged out." });
        }

        var refreshHash = TokenService.HashRefreshToken(refreshPlain);
        var now = DateTime.UtcNow;

        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == refreshHash);

        if (stored is not null && stored.RevokedAt is null)
        {
            if (revokeAll)
            {
                await RevokeAllUserSessionsAsync(stored.UserId, now);
            }
            else
            {
                stored.RevokedAt = now;
                await _db.SaveChangesAsync();
            }
        }

        ClearRefreshCookie();

        return Ok(new { message = "Logged out successfully." });
    }


    private async Task RevokeSessionAsync(string userId, string sessionId, DateTime now)
    {
        // revoga quaisquer refresh tokens activos desta sessão
        var tokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.SessionId == sessionId && rt.RevokedAt == null && rt.ExpiresAt > now)
            .ToListAsync();

        foreach (var t in tokens)
            t.RevokedAt = now;

        await _db.SaveChangesAsync();
    }

    private async Task RevokeAllUserSessionsAsync(string userId, DateTime now)
    {
        var tokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > now)
            .ToListAsync();

        foreach (var t in tokens)
            t.RevokedAt = now;

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Redireciona para a página de erro do frontend com parâmetros de erro OAuth.
    /// </summary>
    private IActionResult RedirectExternalError(string frontendErrorUrl, string error, string? errorDescription = null)
    {
        var queryParams = new Dictionary<string, string?>
        {
            ["error"] = error
        };

        if (!string.IsNullOrWhiteSpace(errorDescription))
        {
            queryParams["error_description"] = errorDescription;
        }

        return Redirect(QueryHelpers.AddQueryString(frontendErrorUrl, queryParams));
    }

    /// <summary>
    /// Resolve o nome do esquema ASP.NET Authentication para um provider externo.
    /// </summary>
    private static string? ResolveAuthScheme(string provider)
    {
        return provider.ToLowerInvariant() switch
        {
            "google" => GoogleDefaults.AuthenticationScheme,
            "microsoft" => MicrosoftAccountDefaults.AuthenticationScheme,
            _ => null
        };
    }

    /// <summary>
    /// Extrai o user id de um access token JWT válido enviado por query string.
    /// </summary>
    private string? ExtractUserIdFromAccessToken(string? accessToken)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return null;
        }

        var jwtKey = _configuration["Jwt:Key"];
        var jwtIssuer = _configuration["Jwt:Issuer"];
        var jwtAudience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            return null;
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
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

        try
        {
            var principal = tokenHandler.ValidateToken(accessToken, validationParameters, out _);
            return principal.FindFirstValue(ClaimTypes.NameIdentifier);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Converte o nome do provider externo para o enum de persistência <see cref="AuthProvider"/>.
    /// </summary>
    private static AuthProvider ResolveAuthProvider(string provider)
    {
        return provider.ToLowerInvariant() switch
        {
            "google" => AuthProvider.Google,
            "microsoft" => AuthProvider.Microsoft,
            _ => AuthProvider.Local
        };
    }

    /// <summary>
    /// Extrai URL de avatar das claims retornadas por providers externos.
    /// </summary>
    private static string? ExtractProfilePicture(ClaimsPrincipal principal)
    {
        return principal.FindFirstValue("picture")
            ?? principal.FindFirstValue("urn:google:picture")
            ?? principal.FindFirstValue("photo");
    }

    /// <summary>
    /// Gera um username único e estável com base no email do utilizador.
    /// </summary>
    private async Task<string> GenerateUniqueUsernameAsync(string email)
    {
        var baseUsername = email.Split('@')[0];
        baseUsername = new string(baseUsername.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());

        if (baseUsername.Length < 3)
        {
            baseUsername = $"user_{baseUsername}";
        }

        if (baseUsername.Length > 25)
        {
            baseUsername = baseUsername[..25];
        }

        var candidate = baseUsername;
        var counter = 1;
        while (await _userManager.FindByNameAsync(candidate) is not null)
        {
            candidate = $"{baseUsername}{counter}";
            counter++;
        }

        return candidate;
    }

    private static DateTime Min(DateTime a, DateTime b) => a <= b ? a : b;

    private void ClearRefreshCookie()
    {
        var cookieName = _configuration["Auth:RefreshCookieName"] ?? "fluxnote_rt";
        Response.Cookies.Delete(cookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });
    }

    private void SetRefreshCookie(string refreshTokenPlain, DateTime expiresAt)
    {
        var cookieName = _configuration["Auth:RefreshCookieName"] ?? "fluxnote_rt";

        Response.Cookies.Append(cookieName, refreshTokenPlain, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(), // dev http -> false; prod https -> true
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt,
            Path = "/"
        });
    }

    [HttpPost("ping")]
    public IActionResult Ping() => Ok("pong");

    /// <summary>
    /// Inicia o fluxo de recuperação de password.
    /// Gera um token de reset e envia email com link (prod) ou guarda em memória (dev).
    /// </summary>
    /// <param name="request">Email do utilizador.</param>
    /// <returns>200 OK sempre (para não revelar se o email existe).</returns>
    /// <remarks>
    /// <b>Rate Limit:</b> Recomendado 3 pedidos por hora por IP.<br/>
    /// <b>Segurança:</b> Resposta sempre igual independentemente de o email existir ou não.
    /// </remarks>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Resposta genérica para não revelar se o email existe
        var genericResponse = new
        {
            message = "If an account with that email exists, a password reset link has been sent."
        };

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !user.EmailConfirmed)
        {
            // Não revelar que o email não existe — retornar a mesma resposta
            return Ok(genericResponse);
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var tokenEncoded = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? _configuration["Frontend:Url"] ?? "http://localhost:4200";

        var resetLink =
            $"{frontendBaseUrl}/reset-password?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(tokenEncoded)}";

        var lang = string.IsNullOrEmpty(request.Lang) ? "en" : request.Lang;
        await _emailSender.SendPasswordResetAsync(user.Email!, resetLink, lang);

        return Ok(genericResponse);
    }

    /// <summary>
    /// Redefine a password do utilizador usando um token válido.
    /// </summary>
    /// <param name="request">UserId, Token, NewPassword, ConfirmPassword.</param>
    /// <returns>
    /// <list type="bullet">
    ///     <item><b>200 OK:</b> Password redefinida com sucesso.</item>
    ///     <item><b>400 Bad Request:</b> Token inválido/expirado ou password não cumpre requisitos.</item>
    /// </list>
    /// </returns>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
        {
            return BadRequest(new
            {
                message = "Invalid or expired reset link.",
                errors = new[] { "The password reset link is invalid or has expired. Please request a new one." }
            });
        }

        string tokenDecoded;
        try
        {
            var tokenBytes = WebEncoders.Base64UrlDecode(request.Token);
            tokenDecoded = Encoding.UTF8.GetString(tokenBytes);
        }
        catch
        {
            return BadRequest(new
            {
                message = "Invalid or expired reset link.",
                errors = new[] { "The password reset token format is invalid." }
            });
        }

        var result = await _userManager.ResetPasswordAsync(user, tokenDecoded, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Password reset failed.",
                errors = result.Errors.Select(e => e.Description)
            });
        }

        // Invalidar todas as sessões existentes por segurança
        var sessions = await _db.RefreshTokens
            .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
            .ToListAsync();
        foreach (var session in sessions)
        {
            session.RevokedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Password has been reset successfully. You can now log in with your new password."
        });
    }

    /// <summary>
    /// [DESENVOLVIMENTO] Obtém o último link de reset de password enviado para um email.
    /// </summary>
    [HttpGet("dev/last-reset-link")]
    public IActionResult DevLastResetLink([FromQuery] string email, [FromServices] IDevEmailStore store)
    {
        if (!HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            return NotFound();

        var link = store.Get(email);
        if (link is null) return NotFound(new { message = "No link found for this email." });

        return Ok(new { resetLink = link });
    }


    //// GET: api/users
    //[HttpGet("users")]
    //public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    //{
    //    //Inclui os teammembers
    //    return await _db.Users.Include(u => u.Teams).ToListAsync();
    //}

}
