using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Services.Email;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using System.Text;

namespace Fluxnote.Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    public AuthController(UserManager<User> userManager, IEmailSender emailSender, IConfiguration configuration)
    {
        _userManager = userManager;
        _emailSender = emailSender;
        _configuration = configuration;
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
                new { 
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
}
