using FluentValidation.TestHelper;
using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Validators;

namespace Fluxnote.Backend.Tests.Validators;

public class RegisterRequestValidatorTests
{
    private readonly RegisterRequestValidator _validator = new();

    private static RegisterRequest Valid() => new()
    {
        Email = "user@example.com",
        Password = "Valid@1234",
        FullName = "John Doe"
    };

    // ─── Email ────────────────────────────────────────────────

    [Fact]
    public void Email_WhenEmpty_ShouldHaveError()
    {
        var m = Valid(); m.Email = "";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Email_WhenInvalidFormat_ShouldHaveError()
    {
        var m = Valid(); m.Email = "notanemail";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Email_WhenMissingDomain_ShouldHaveError()
    {
        var m = Valid(); m.Email = "user@";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Email_WhenValid_ShouldNotHaveError()
    {
        _validator.TestValidate(Valid()).ShouldNotHaveValidationErrorFor(x => x.Email);
    }

    // ─── FullName ─────────────────────────────────────────────

    [Fact]
    public void FullName_WhenEmpty_ShouldHaveError()
    {
        var m = Valid(); m.FullName = "";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.FullName);
    }

    [Fact]
    public void FullName_WhenSingleChar_ShouldHaveError()
    {
        var m = Valid(); m.FullName = "A";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.FullName);
    }

    [Fact]
    public void FullName_When101Chars_ShouldHaveError()
    {
        var m = Valid(); m.FullName = new string('A', 101);
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.FullName);
    }

    [Fact]
    public void FullName_WhenExactly2Chars_ShouldNotHaveError()
    {
        var m = Valid(); m.FullName = "Jo";
        _validator.TestValidate(m).ShouldNotHaveValidationErrorFor(x => x.FullName);
    }

    [Fact]
    public void FullName_WhenExactly100Chars_ShouldNotHaveError()
    {
        var m = Valid(); m.FullName = new string('A', 100);
        _validator.TestValidate(m).ShouldNotHaveValidationErrorFor(x => x.FullName);
    }

    [Fact]
    public void FullName_WhenValid_ShouldNotHaveError()
    {
        _validator.TestValidate(Valid()).ShouldNotHaveValidationErrorFor(x => x.FullName);
    }

    // ─── Password ─────────────────────────────────────────────

    [Fact]
    public void Password_WhenEmpty_ShouldHaveError()
    {
        var m = Valid(); m.Password = "";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenShorterThan8Chars_ShouldHaveError()
    {
        var m = Valid(); m.Password = "Ab1@";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenNoLetters_ShouldHaveError()
    {
        var m = Valid(); m.Password = "12345678@";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenNoNumbers_ShouldHaveError()
    {
        var m = Valid(); m.Password = "Password@abc";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenNoSpecialChars_ShouldHaveError()
    {
        var m = Valid(); m.Password = "Password123";
        _validator.TestValidate(m).ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenExactly8ValidChars_ShouldNotHaveError()
    {
        var m = Valid(); m.Password = "Abcd1@!x";
        _validator.TestValidate(m).ShouldNotHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenValid_ShouldNotHaveError()
    {
        _validator.TestValidate(Valid()).ShouldNotHaveValidationErrorFor(x => x.Password);
    }

    // ─── Full request ─────────────────────────────────────────

    [Fact]
    public void WholeRequest_WhenAllValid_ShouldPassWithNoErrors()
    {
        _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void WholeRequest_WhenAllInvalid_ShouldHaveErrorsForAllFields()
    {
        var m = new RegisterRequest { Email = "bad", Password = "bad", FullName = "X" };
        var result = _validator.TestValidate(m);
        result.ShouldHaveValidationErrorFor(x => x.Email);
        result.ShouldHaveValidationErrorFor(x => x.FullName);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }
}
