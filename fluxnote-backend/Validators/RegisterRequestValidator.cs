using FluentValidation;
using Fluxnote.Backend.Contracts.Auth;

namespace Fluxnote.Backend.Validators
{
    public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
    {
        public RegisterRequestValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email is required.");
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name is required.")
                .MinimumLength(2).WithMessage("Full name must be at least 2 characters long")
                .MaximumLength(100).WithMessage("Full name cannot exceed 100 characters.");
            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("A password is required.")
                .MinimumLength(8).WithMessage("A password must be at least 8 characters long")
                .Matches("[A-Za-z]").WithMessage("A password must contain letters.")
                .Matches("[0-9]").WithMessage("A password must contain numbers.")
                .Matches("[^A-Za-z0-9]").WithMessage("A password must contain special characters.");
        }
    }
}
