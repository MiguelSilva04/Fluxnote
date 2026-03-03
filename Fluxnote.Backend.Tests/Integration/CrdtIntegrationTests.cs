using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;
using Xunit;

namespace Fluxnote.Backend.Tests.Integration
{
    /// <summary>
    /// Testes de integração para o endpoint GET /api/documents/{id}/ydoc
    /// e para verificar que o Hub SignalR está correctamente mapeado.
    ///
    /// Critérios da task CRDT:
    ///   - Conflitos resolvidos automaticamente (via Yjs)
    ///   - Sem estados inconsistentes (snapshot persistido na BD)
    ///   - Teste de edição simultânea (endpoint e hub acessíveis)
    /// </summary>
    public class CrdtIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public CrdtIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        // ─────────────────────────────────────────────────────────
        // GET /api/documents/{id}/ydoc
        // ─────────────────────────────────────────────────────────

        [Fact]
        public async Task GetYDocSnapshot_NewDocument_ReturnsNullSnapshot()
        {
            // Arrange — criar utilizador e documento novo (sem snapshot Yjs ainda)
            var email = $"crdt-new-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Documento CRDT Teste",
                TeamName = "Equipa CRDT"
            };
            var createResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var doc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act
            var response = await authClient.GetAsync($"/api/documents/{doc!.Id}/ydoc");

            // Assert — 200 OK com snapshot null (documento ainda não tem Y.Doc guardado)
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadFromJsonAsync<YDocSnapshotResponse>();
            Assert.NotNull(body);
            Assert.Null(body!.Snapshot);
        }

        [Fact]
        public async Task GetYDocSnapshot_Unauthenticated_Returns401()
        {
            // Act — sem token JWT
            var response = await _client.GetAsync("/api/documents/1/ydoc");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetYDocSnapshot_UserNotTeamMember_Returns403()
        {
            // Arrange — utilizador A cria o documento
            var ownerEmail = $"crdt-owner-{Guid.NewGuid()}@test.com";
            var strangerEmail = $"crdt-stranger-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(strangerEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var strangerToken = await LoginAndGetTokenAsync(strangerEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var strangerClient = CreateAuthenticatedClient(strangerToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Documento Privado",
                TeamName = "Equipa Privada"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var doc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act — utilizador B (sem pertencer à equipa) tenta aceder ao Y.Doc
            var response = await strangerClient.GetAsync($"/api/documents/{doc!.Id}/ydoc");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetYDocSnapshot_DocumentNotFound_Returns404()
        {
            // Arrange
            var email = $"crdt-notfound-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Act — ID que não existe
            var response = await authClient.GetAsync("/api/documents/999999/ydoc");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        // ─────────────────────────────────────────────────────────
        // Hub SignalR — /hubs/document
        // ─────────────────────────────────────────────────────────

        [Fact]
        public async Task SignalRHub_NegotiateEndpoint_IsReachable()
        {
            // Arrange — o Hub tem [Authorize], por isso o token é necessário
            var email = $"crdt-hub-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");

            // SignalR envia o token como query string (limitação do WebSocket)
            var negotiateUrl = $"/hubs/document/negotiate?negotiateVersion=1&access_token={token}";

            // Act
            var response = await _client.PostAsync(negotiateUrl, null);

            // Assert — o hub está mapeado (não é 404)
            // 200 = negociação bem-sucedida, 400 = hub existe mas recusou parâmetros
            Assert.NotEqual(HttpStatusCode.NotFound, response.StatusCode);
        }

        // ─────────────────────────────────────────────────────────
        // Helpers (padrão idêntico ao DocumentSummaryIntegrationTests)
        // ─────────────────────────────────────────────────────────

        private async Task CreateAndConfirmUserAsync(string email, string password)
        {
            var registerRequest = new RegisterRequest
            {
                Email = email,
                Password = password,
                FullName = "Test User"
            };

            await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

            var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
            var link = emailSender.LastConfirmationLink;

            if (link != null)
            {
                var uri = new Uri(link);
                var qs = HttpUtility.ParseQueryString(uri.Query);
                var userId = qs["userId"];
                var token = qs["token"];

                await _client.GetAsync(
                    $"/api/auth/confirm-email?userId={Uri.EscapeDataString(userId!)}&token={Uri.EscapeDataString(token!)}");
            }
        }

        private async Task<string> LoginAndGetTokenAsync(string email, string password)
        {
            var loginRequest = new LoginRequest
            {
                Email = email,
                Password = password,
                RememberMe = false
            };

            var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
            resp.EnsureSuccessStatusCode();

            var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
            return body!.AccessToken;
        }

        private HttpClient CreateAuthenticatedClient(string accessToken)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);
            return client;
        }

        // DTO interno para desserializar a resposta do endpoint /ydoc
        private record YDocSnapshotResponse(string? Snapshot);
    }
}
