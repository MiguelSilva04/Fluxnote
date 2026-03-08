using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Fluxnote.Backend.Tests.Helpers;

public static class ControllerTestHelper
{
    /// <summary>
    /// Creates a ControllerContext with a ClaimsPrincipal containing the given userId,
    /// simulating an authenticated JWT user for controller tests.
    /// </summary>
    public static ControllerContext CreateControllerContext(string userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        return new ControllerContext { HttpContext = httpContext };
    }
}
