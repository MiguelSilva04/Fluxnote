using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Services.Email;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Services.Auth;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Fluxnote.Backend.Controllers;

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

    private const int AccessTokenMinutesDefault = 15;
    private const int RefreshSlidingDaysDefault = 7;
    private const int RefreshAbsoluteDaysDefault = 30;
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
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // o userManager é tipo o serviço que gere os users no identity
        // é a partir dele que criamos users, procuramos, etc
        // fazemos verificações pra ver se o email ja ta registado
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
        {
            return Conflict(
                new
                {
                    message = "Email is already registered."
                });
        }
        // criar a instancia do user
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

        // criar o user na bd com a password o identity gera o passwordHash e guarda
        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            // devolver erros do Identity de forma legível
            return Conflict(
                new
                {
                    message = "User creation failed.",
                    errors = createResult.Errors.Select(e => e.Description)
                });
        }

        // gerar token de confirmação de email
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

        // codificar o token para URL
        var tokenBytes = Encoding.UTF8.GetBytes(token);
        var tokenEncoded = WebEncoders.Base64UrlEncode(tokenBytes);

        // criar link de confirmação (por agora vai para o backend)
        // em produção isto devia apontar para o frontend
        var frontendBaseUrl = _configuration["Frontend:BaseUrl"];
        var confirmationLink = $"{frontendBaseUrl ?? "http://localhost:4200"}/confirm-email?userId={user.Id}&token={tokenEncoded}";

        // enviar email de confirmação (simulado)
        await _emailSender.SendEmailConfirmationAsync(user.Email, confirmationLink);

        // devolver resposta de sucesso
        return Ok(new
        {
            message = "User registered successfully. Please check your email to confirm your account.",
            status = "PendingEmailConfirmation"
        });
    }

    // -------------------------
    // LOGIN
    // Sliding + absolute cap:
    // - refresh token expira em min(now+7d, sessionStart+30d)
    // - sessionStart é "agora" no login, e é herdado em todas as rotações
    // -------------------------
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Conflict(new
            {
                message = "Invalid Credentials",
                errors = new[] { "Invalid email or password." }
            });
        }

        // Account validity checks
        var accountErrors = new List<string>();
        if (!user.EmailConfirmed)
            accountErrors.Add("Email not confirmed.");
        if (user.AccountStatus != AccountStatus.Active)
            accountErrors.Add($"Account status: {user.AccountStatus}.");

        if (accountErrors.Count > 0)
        {
            return Conflict(new
            {
                message = "Account not valid or Conflict",
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
            var signInErrors = new List<string>();
            if (signIn.IsLockedOut)
                signInErrors.Add("Too many failed attempts. Account is locked.");
            if (signIn.IsNotAllowed)
                signInErrors.Add("Sign-in is not allowed for this account.");
            if (signIn.RequiresTwoFactor)
                signInErrors.Add("Two-factor authentication required.");
            if (signInErrors.Count == 0)
                signInErrors.Add("Invalid credentials.");

            return Conflict(new
            {
                message = "Invalid Credentials",
                errors = signInErrors
            });
        }

        var accessToken = _tokenService.CreateAccessToken(user);

        var refreshPlain = TokenService.GenerateRefreshTokenPlain();
        var refreshHash = TokenService.HashRefreshToken(refreshPlain);

        var now = DateTime.UtcNow;
        var sessionId = Guid.NewGuid().ToString();
        var sessionStartedAt = now;
        var lastUsedAt = now;
        var idleDays = 7;
        var absoluteDays = request.RememberMe ? 30 : 7;
        var expiresAt = Min(now.AddDays(idleDays), sessionStartedAt.AddDays(absoluteDays));

        _db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = refreshHash,
            UserId = user.Id,
            SessionId = sessionId,
            SessionStartedAt = sessionStartedAt,
            LastUsedAt = lastUsedAt,
            ExpiresAt = expiresAt,
            CreatedAt = now,
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        });

        await _db.SaveChangesAsync();

        SetRefreshCookie(refreshPlain, expiresAt);

        return Ok(new
        {
            accessToken,
            expiresInSeconds = 15 * 60
        });
    }

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

    [HttpGet("dev/last-confirmation-link")]
    public IActionResult DevLastConfirmationLink([FromQuery] string email, [FromServices] IDevEmailStore store)
    {
        if (!HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            return NotFound();

        var link = store.Get(email);
        if (link is null) return NotFound(new { message = "No link found for this email." });

        return Ok(new { confirmationLink = link });
    }


    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var cookieName = _configuration["Auth:RefreshCookieName"] ?? "fluxnote_rt";
        if (!Request.Cookies.TryGetValue(cookieName, out var refreshPlain) || string.IsNullOrWhiteSpace(refreshPlain))
            return Conflict(new { message = "Missing refresh token." });

        var now = DateTime.UtcNow;
        var refreshHash = TokenService.HashRefreshToken(refreshPlain);

        var idleDays = int.Parse(_configuration["Auth:RefreshIdleDays"] ?? "7");
        var absoluteDays = int.Parse(_configuration["Auth:RefreshAbsoluteDays"] ?? "30");

        // Carregar token
        var stored = await _db.RefreshTokens
            .AsTracking()
            .FirstOrDefaultAsync(rt => rt.TokenHash == refreshHash);

        if (stored is null)
            return Conflict(new { message = "Invalid refresh token." });

        // Reuse detection: token revogado reapareceu
        if (stored.RevokedAt is not null)
        {
            // Reacção: revogar a sessão toda (por SessionId)
            await RevokeSessionAsync(stored.UserId, stored.SessionId, now);
            ClearRefreshCookie();
            return Conflict(new { message = "Refresh token reuse detected. Session revoked." });
        }

        // Expiração por tempo total (ExpiresAt)
        if (stored.ExpiresAt <= now)
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Conflict(new { message = "Refresh token expired." });
        }

        // Absolute cap (30 dias desde início da sessão)
        var absoluteExpiresAt = stored.SessionStartedAt.AddDays(absoluteDays);
        if (now >= absoluteExpiresAt)
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Conflict(new { message = "Session expired (absolute cap)." });
        }

        // Idle timeout (7 dias desde última utilização)
        if (now - stored.LastUsedAt > TimeSpan.FromDays(idleDays))
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Conflict(new { message = "Session expired (idle timeout)." });
        }

        // User
        var user = await _userManager.FindByIdAsync(stored.UserId);
        if (user is null || !user.EmailConfirmed || user.AccountStatus != AccountStatus.Active)
        {
            stored.RevokedAt = now;
            await _db.SaveChangesAsync();
            ClearRefreshCookie();
            return Conflict(new { message = "User inactive." });
        }

        // Rotação (novo refresh + revogar antigo)
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
            CreatedAt = now,
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        });

        // actualiza também o LastUsedAt do token actual (opcional, mas útil para auditoria)
        // stored.LastUsedAt = now; // normalmente não, porque foi revogado; mantém histórico.

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

    [HttpPost("logout")]
    public Task<IActionResult> Logout() => LogoutCore(revokeAll: false);

    [HttpPost("logout-all")]
    public Task<IActionResult> LogoutAll() => LogoutCore(revokeAll: true);

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
                await RevokeSessionAsync(stored.UserId, stored.SessionId, now);
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
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > now)
            .ToListAsync();

        foreach (var t in tokens)
            t.RevokedAt = now;

        await _db.SaveChangesAsync();
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

}
