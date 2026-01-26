namespace Fluxnote.Backend.Dtos.Auth;

public record TokenResponse(string AccessToken, int ExpiresInSeconds);