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
    // -------------------------
    // REGISTER
    // - 409 se email já existe
    // - 400 se validação/Identity falhar
    // -------------------------
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

        // em produção deve apontar para o frontend; em dev mantém fallback
        var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:4200";
        var confirmationLink =
            $"{frontendBaseUrl}/confirm-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(tokenEncoded)}";

        await _emailSender.SendEmailConfirmationAsync(user.Email!, confirmationLink);

        return Ok(new
        {
            message = "User registered successfully. Please check your email to confirm your account.",
            status = "PendingEmailConfirmation"
        });
    }


    // -------------------------
    // LOGIN
    // Status codes:
    // - 401: credenciais inválidas
    // - 403: conta não confirmada / não activa
    // - 423: locked out (opcional mas explícito)
    // Sem leaks desnecessários (mensagem genérica em 401)
    // Sliding+cap:
    // - idleDays (sempre) vem de config Auth:RefreshIdleDays (default 7)
    // - absoluteDays depende de rememberMe (7 vs 30) e é guardado por sessão
    // -------------------------
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

    // -------------------------
    // REFRESH
    // Status codes:
    // - 401: sem cookie / inválido / expirado / revogado / idle / cap / user inválido
    // Reuse detection:
    // - token revogado reapareceu -> revogar sessão toda e 401
    // Sliding+cap:
    // - newExpiresAt = min(now+idleDays, sessionStart+absoluteDays)
    // - idleDays e absoluteDays vêm do token guardado (por sessão) para respeitar rememberMe
    // -------------------------
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        Console.WriteLine("REFRESH ACTION HIT");
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

    [HttpPost("ping")]
    public IActionResult Ping() => Ok("pong");


    //// GET: api/users
    //[HttpGet("users")]
    //public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    //{
    //    //Inclui os teammembers
    //    return await _db.Users.Include(u => u.Teams).ToListAsync();
    //}

}
