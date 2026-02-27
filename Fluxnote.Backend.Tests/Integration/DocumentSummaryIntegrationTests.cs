using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.Requirements
{
    /// <summary>
    /// Testes de integração para o endpoint POST /api/documents/{id}/summary.
    /// Testa a integração com o serviço de IA (3rd party - Google Gemini) via TestAIService fake.
    /// </summary>
    public class DocumentSummaryIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public DocumentSummaryIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        #region POST /api/documents/{id}/summary

        [Fact]
        public async Task GenerateSummary_WithValidDocument_ReturnsSummary()
        {
            // Arrange - Criar utilizador, documento com conteúdo e configurar o fake AI
            var email = $"summary-valid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar documento com nova equipa
            var docRequest = new CreateDocumentRequest
            {
                Title = "Document for Summary",
                TeamName = "Team Summary Test"
            };
            var createResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar conteúdo ao documento (para que tenha PlainText)
            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>This is a test document with some content about software engineering. It covers topics like testing, integration, and deployment strategies.</p>"
            };
            await authClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Configurar o fake AI service
            var aiService = _factory.Services.GetRequiredService<TestAIService>();
            aiService.SummaryToReturn = "This document discusses software engineering topics including testing, integration, and deployment strategies.";

            // Act - Gerar resumo
            var response = await authClient.PostAsync($"/api/documents/{createdDoc.Id}/summary", null);

            // Assert - Verificar resposta com sucesso
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(body);
            var summary = json.RootElement.GetProperty("summary").GetString();

            Assert.NotNull(summary);
            Assert.Contains("software engineering", summary);
            Assert.True(aiService.CallCount >= 1);
            Assert.NotNull(aiService.LastReceivedText);
        }

        [Fact]
        public async Task GenerateSummary_WithEmptyDocument_ReturnsBadRequest()
        {
            // Arrange - Criar documento sem conteúdo
            var email = $"summary-empty-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Empty Document for Summary",
                TeamName = "Team Empty Summary"
            };
            var createResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act - Tentar gerar resumo de documento vazio
            var response = await authClient.PostAsync($"/api/documents/{createdDoc!.Id}/summary", null);

            // Assert - Deve retornar 400 Bad Request
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("no content", body, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task GenerateSummary_WithoutAuth_ReturnsUnauthorized()
        {
            // Act - Tentar gerar resumo sem autenticação
            var response = await _client.PostAsync("/api/documents/1/summary", null);

            // Assert - Deve retornar 401 Unauthorized
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GenerateSummary_AsNonTeamMember_ReturnsForbidden()
        {
            // Arrange - Criar dois utilizadores: owner e outro que não é membro
            var ownerEmail = $"summary-owner-{Guid.NewGuid()}@test.com";
            var otherEmail = $"summary-other-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(otherEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var otherToken = await LoginAndGetTokenAsync(otherEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var otherClient = CreateAuthenticatedClient(otherToken);

            // Owner cria documento com conteúdo
            var docRequest = new CreateDocumentRequest
            {
                Title = "Private Document for Summary",
                TeamName = "Private Team Summary"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Some private content that should not be accessible.</p>"
            };
            await ownerClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Act - Outro utilizador tenta gerar resumo
            var response = await otherClient.PostAsync($"/api/documents/{createdDoc.Id}/summary", null);

            // Assert - Deve retornar 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GenerateSummary_DocumentNotFound_ReturnsNotFound()
        {
            // Arrange - Utilizador autenticado
            var email = $"summary-notfound-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Act - Tentar gerar resumo de documento que não existe
            var response = await authClient.PostAsync("/api/documents/999999/summary", null);

            // Assert - Deve retornar 404 Not Found
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GenerateSummary_AIServiceRateLimited_Returns429()
        {
            // Arrange - Criar documento com conteúdo e simular rate limit
            var email = $"summary-ratelimit-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Document for Rate Limit Test",
                TeamName = "Team Rate Limit"
            };
            var createResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Content for testing rate limit scenario.</p>"
            };
            await authClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Configurar o fake AI para lançar InvalidOperationException (rate limit)
            var aiService = _factory.Services.GetRequiredService<TestAIService>();
            aiService.ExceptionToThrow = new InvalidOperationException("Rate limit exceeded. Please wait a moment and try again.");

            // Act - Gerar resumo (vai receber rate limit)
            var response = await authClient.PostAsync($"/api/documents/{createdDoc.Id}/summary", null);

            // Assert - Deve retornar 429 Too Many Requests
            Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);

            // Cleanup
            aiService.Reset();
        }

        [Fact]
        public async Task GenerateSummary_AIServiceError_Returns500()
        {
            // Arrange - Criar documento com conteúdo e simular erro genérico da IA
            var email = $"summary-error-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Document for AI Error Test",
                TeamName = "Team AI Error"
            };
            var createResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Content for testing AI error scenario.</p>"
            };
            await authClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Configurar o fake AI para lançar Exception genérica
            var aiService = _factory.Services.GetRequiredService<TestAIService>();
            aiService.ExceptionToThrow = new Exception("AI service returned error: InternalServerError");

            // Act - Gerar resumo (vai receber erro)
            var response = await authClient.PostAsync($"/api/documents/{createdDoc.Id}/summary", null);

            // Assert - Deve retornar 500 Internal Server Error
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("Failed to generate summary", body, StringComparison.OrdinalIgnoreCase);

            // Cleanup
            aiService.Reset();
        }

        [Fact]
        public async Task GenerateSummary_AsMemberWithPermission_ReturnsSummary()
        {
            // Arrange - Owner cria documento, adiciona membro com permissão, membro gera resumo
            var ownerEmail = $"summary-ownerp-{Guid.NewGuid()}@test.com";
            var memberEmail = $"summary-memberp-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento com conteúdo
            var docRequest = new CreateDocumentRequest
            {
                Title = "Document for Member Summary",
                TeamName = "Team Member Summary"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>This is shared content for the team member to summarize.</p>"
            };
            await ownerClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Adicionar membro à equipa
            var memberId = await GetUserIdAsync(memberEmail);
            var addMemberRequest = new { UserId = memberId, Role = (int)TeamRole.Member };
            await ownerClient.PostAsJsonAsync("/api/teammembers", new { UserId = memberId, TeamId = createdDoc.TeamId, Role = 0 });

            // Obter o TeamMemberId do novo membro
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var teamMember = await db.TeamMember
                .FirstOrDefaultAsync(m => m.UserId == memberId && m.TeamId == createdDoc.TeamId);

            if (teamMember != null)
            {
                // Criar DocumentPermission para o membro
                var permission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(permission);
                await db.SaveChangesAsync();
            }

            // Configurar o fake AI service
            var aiService = _factory.Services.GetRequiredService<TestAIService>();
            aiService.SummaryToReturn = "This document contains shared content for the team.";
            aiService.ExceptionToThrow = null;

            // Act - Membro gera resumo
            var response = await memberClient.PostAsync($"/api/documents/{createdDoc.Id}/summary", null);

            // Assert - Deve retornar 200 OK com resumo
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(body);
            var summary = json.RootElement.GetProperty("summary").GetString();

            Assert.NotNull(summary);
            Assert.Equal("This document contains shared content for the team.", summary);
        }

        [Fact]
        public async Task GenerateSummary_AsMemberWithoutPermission_ReturnsForbidden()
        {
            // Arrange - Owner cria documento, adiciona membro SEM permissão no documento
            var ownerEmail = $"summary-ownernp-{Guid.NewGuid()}@test.com";
            var memberEmail = $"summary-membernp-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento com conteúdo
            var docRequest = new CreateDocumentRequest
            {
                Title = "Document Without Permission",
                TeamName = "Team No Permission Summary"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Content that member cannot access.</p>"
            };
            await ownerClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Adicionar membro à equipa (sem DocumentPermission no documento)
            var memberId = await GetUserIdAsync(memberEmail);
            await ownerClient.PostAsJsonAsync("/api/teammembers", new { UserId = memberId, TeamId = createdDoc.TeamId, Role = 0 });

            // Act - Membro tenta gerar resumo sem permissão no documento
            var response = await memberClient.PostAsync($"/api/documents/{createdDoc.Id}/summary", null);

            // Assert - Deve retornar 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GenerateSummary_DeletedDocument_ReturnsNotFound()
        {
            // Arrange - Criar documento, eliminá-lo (soft delete) e tentar gerar resumo
            var email = $"summary-deleted-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Document to Delete for Summary",
                TeamName = "Team Delete Summary"
            };
            var createResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Content that will be deleted.</p>"
            };
            await authClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Soft delete do documento
            await authClient.DeleteAsync($"/api/documents/{createdDoc.Id}");

            // Act - Tentar gerar resumo de documento eliminado
            var response = await authClient.PostAsync($"/api/documents/{createdDoc.Id}/summary", null);

            // Assert - Deve retornar 404 Not Found (documento está no trash)
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        #endregion

        #region Helper Methods

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

                await _client.GetAsync($"/api/auth/confirm-email?userId={Uri.EscapeDataString(userId!)}&token={Uri.EscapeDataString(token!)}");
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
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            return client;
        }

        private async Task<string> GetUserIdAsync(string email)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? "";
        }

        #endregion
    }
}
