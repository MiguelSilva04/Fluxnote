namespace Fluxnote.Backend.Services.Email;

public class EmailOptions
{
    public string FromName { get; set; } = "Fluxnote";
    public string FromEmail { get; set; } = default!;
    public string SmtpHost { get; set; } = default!;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = default!;
    public string SmtpPass { get; set; } = default!;
    public bool UseStartTls { get; set; } = true;
}
