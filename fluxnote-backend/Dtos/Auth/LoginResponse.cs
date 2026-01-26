namespace Fluxnote.Backend.Dtos.Auth;

public record LoginResponse(string AccessToken, int ExpiresInSeconds);