using FluentValidation;
using Fluxnote.Backend.Contracts.Auth;

namespace Fluxnote.Backend.Validators
{
    /// <summary>
    /// Validador FluentValidation para pedidos de registo de utilizador.
    /// </summary>
    /// <remarks>
    /// <b>Integração:</b><br/>
    /// Registado automaticamente via AddValidatorsFromAssemblyContaining em Program.cs.<br/>
    /// Integra com o pipeline MVC via FluentValidation.AspNetCore.
    ///
    /// <b>Regras de Validação:</b>
    /// <list type="table">
    ///     <listheader>
    ///         <term>Campo</term>
    ///         <description>Regras</description>
    ///     </listheader>
    ///     <item>
    ///         <term>Email</term>
    ///         <description>Obrigatório, formato de email válido</description>
    ///     </item>
    ///     <item>
    ///         <term>FullName</term>
    ///         <description>Obrigatório, 2-100 caracteres</description>
    ///     </item>
    ///     <item>
    ///         <term>Password</term>
    ///         <description>Obrigatório, mínimo 8 caracteres, letras, números e especiais</description>
    ///     </item>
    /// </list>
    ///
    /// <b>Nota:</b> As validações do Identity (unicidade de email, etc.) são aplicadas
    /// adicionalmente no controlador após a validação do FluentValidation.
    /// </remarks>
    public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
    {
        /// <summary>
        /// Configura as regras de validação para RegisterRequest.
        /// </summary>
        public RegisterRequestValidator()
        {
            // Validação de Email
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email is required.");

            // Validação de Nome Completo
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name is required.")
                .MinimumLength(2).WithMessage("Full name must be at least 2 characters long")
                .MaximumLength(100).WithMessage("Full name cannot exceed 100 characters.");

            // Validação de Password
            // Nota: Identity também valida, mas FluentValidation fornece mensagens mais amigáveis
            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("A password is required.")
                .MinimumLength(8).WithMessage("A password must be at least 8 characters long")
                .Matches("[A-Za-z]").WithMessage("A password must contain letters.")
                .Matches("[0-9]").WithMessage("A password must contain numbers.")
                .Matches("[^A-Za-z0-9]").WithMessage("A password must contain special characters.");
        }
    }
}
