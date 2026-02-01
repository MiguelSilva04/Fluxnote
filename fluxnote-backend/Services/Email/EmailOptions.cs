namespace Fluxnote.Backend.Services.Email;

/// <summary>
/// Opções de configuração para o serviço de email SMTP.
/// </summary>
/// <remarks>
/// <b>Configuração em appsettings.json:</b>
/// <code>
/// {
///     "EmailOptions": {
///         "FromName": "Fluxnote",
///         "FromEmail": "noreply@fluxnote.com",
///         "SmtpHost": "smtp.example.com",
///         "SmtpPort": 587,
///         "SmtpUser": "username",
///         "SmtpPass": "password",
///         "UseStartTls": true
///     }
/// }
/// </code>
///
/// <b>Registo em Program.cs:</b>
/// <code>services.Configure&lt;EmailOptions&gt;(configuration.GetSection("EmailOptions"));</code>
///
/// <b>Portas Comuns:</b>
/// <list type="bullet">
///     <item><description><b>25:</b> SMTP sem encriptação (não recomendado)</description></item>
///     <item><description><b>465:</b> SMTPS (SSL implícito)</description></item>
///     <item><description><b>587:</b> SMTP com STARTTLS (recomendado)</description></item>
/// </list>
/// </remarks>
public class EmailOptions
{
    /// <summary>
    /// Nome do remetente que aparece nos emails.
    /// </summary>
    /// <example>Fluxnote</example>
    public string FromName { get; set; } = "Fluxnote";

    /// <summary>
    /// Endereço de email do remetente.
    /// </summary>
    /// <example>noreply@fluxnote.com</example>
    public string FromEmail { get; set; } = default!;

    /// <summary>
    /// Hostname ou IP do servidor SMTP.
    /// </summary>
    /// <example>smtp.gmail.com, mail.smtp2go.com</example>
    public string SmtpHost { get; set; } = default!;

    /// <summary>
    /// Porta do servidor SMTP.
    /// </summary>
    /// <remarks>Valor padrão: 587 (STARTTLS)</remarks>
    public int SmtpPort { get; set; } = 587;

    /// <summary>
    /// Username para autenticação SMTP.
    /// </summary>
    public string SmtpUser { get; set; } = default!;

    /// <summary>
    /// Password para autenticação SMTP.
    /// </summary>
    /// <remarks>
    /// <b>⚠️ SEGURANÇA:</b> Usar User Secrets ou variáveis de ambiente em produção.<br/>
    /// Nunca commitar passwords em código fonte.
    /// </remarks>
    public string SmtpPass { get; set; } = default!;

    /// <summary>
    /// Indica se deve usar STARTTLS para encriptação.
    /// </summary>
    /// <remarks>
    /// True: Inicia conexão sem encriptação e depois atualiza para TLS<br/>
    /// False: Usa deteção automática de segurança<br/>
    /// Valor padrão: true
    /// </remarks>
    public bool UseStartTls { get; set; } = true;
}
