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
using System.Text;
using System.Text.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.Requirements
{
    /// <summary>
    /// Testes de integração para os endpoints de contexto de documentos:
    /// POST /api/documents/{id}/context
    /// GET  /api/documents/{id}/context
    /// DELETE /api/documents/{id}/context/{contextId}
    /// </summary>
    public class DocumentContextIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public DocumentContextIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        #region POST /api/documents/{id}/context

        [Fact]
        public async Task UploadContext_TxtFile_AsOwner_Returns201WithHasExtractedText()
        {
            // Arrange
            var email = $"ctx-upload-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var doc = await CreateDocumentAsync(authClient, "Context Test Doc");

            var content = CreateTxtFormFile("Conteúdo de exemplo para contexto de IA.", "context.txt");

            // Act
            var response = await authClient.PostAsync($"/api/documents/{doc.Id}/context", content);

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var dto = await response.Content.ReadFromJsonAsync<DocumentContextDto>();
            Assert.NotNull(dto);
            Assert.Equal("context.txt", dto.FileName);
            Assert.Equal("text/plain", dto.ContentType);
            Assert.True(dto.HasExtractedText);
            Assert.True(dto.FileSizeBytes > 0);
        }

        [Fact]
        public async Task UploadContext_WithoutAuth_Returns401()
        {
            // Arrange
            var content = CreateTxtFormFile("texto", "test.txt");

            // Act
            var response = await _client.PostAsync("/api/documents/1/context", content);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task UploadContext_DocumentNotFound_Returns404()
        {
            // Arrange
            var email = $"ctx-notfound-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var content = CreateTxtFormFile("texto", "test.txt");

            // Act
            var response = await authClient.PostAsync("/api/documents/999999/context", content);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task UploadContext_AsNonMember_Returns403()
        {
            // Arrange
            var ownerEmail = $"ctx-owner-nm-{Guid.NewGuid()}@test.com";
            var otherEmail = $"ctx-other-nm-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(otherEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var otherToken = await LoginAndGetTokenAsync(otherEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var otherClient = CreateAuthenticatedClient(otherToken);

            var doc = await CreateDocumentAsync(ownerClient, "Doc Non Member Context");

            var content = CreateTxtFormFile("texto", "test.txt");

            // Act
            var response = await otherClient.PostAsync($"/api/documents/{doc.Id}/context", content);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task UploadContext_AsViewer_Returns403()
        {
            // Arrange
            var ownerEmail = $"ctx-owner-viewer-{Guid.NewGuid()}@test.com";
            var viewerEmail = $"ctx-viewer-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(viewerEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var viewerToken = await LoginAndGetTokenAsync(viewerEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var viewerClient = CreateAuthenticatedClient(viewerToken);

            var doc = await CreateDocumentAsync(ownerClient, "Doc Viewer Context");

            // Adicionar membro à equipa e dar permissão Viewer
            var viewerId = await GetUserIdAsync(viewerEmail);
            var addMemberResp = await ownerClient.PostAsJsonAsync("/api/teammembers", new
            {
                UserId = viewerId,
                TeamId = doc.TeamId,
                Role = 0  // Member
            });
            addMemberResp.EnsureSuccessStatusCode();

            var viewerTeamMemberId = await GetTeamMemberIdAsync(viewerId, doc.TeamId);
            var addPermResp = await ownerClient.PostAsJsonAsync("/api/documentpermissions", new
            {
                TeamMemberId = viewerTeamMemberId,
                DocumentId = doc.Id,
                Role = 0  // Viewer
            });
            addPermResp.EnsureSuccessStatusCode();

            var content = CreateTxtFormFile("texto do viewer", "viewer.txt");

            // Act
            var response = await viewerClient.PostAsync($"/api/documents/{doc.Id}/context", content);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task UploadContext_AsEditor_Returns201()
        {
            // Arrange
            var ownerEmail = $"ctx-owner-editor-{Guid.NewGuid()}@test.com";
            var editorEmail = $"ctx-editor-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(editorEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var editorToken = await LoginAndGetTokenAsync(editorEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var editorClient = CreateAuthenticatedClient(editorToken);

            var doc = await CreateDocumentAsync(ownerClient, "Doc Editor Context");

            // Adicionar membro à equipa e dar permissão Editor
            var editorId = await GetUserIdAsync(editorEmail);
            await ownerClient.PostAsJsonAsync("/api/teammembers", new
            {
                UserId = editorId,
                TeamId = doc.TeamId,
                Role = 0  // Member
            });

            var editorTeamMemberId = await GetTeamMemberIdAsync(editorId, doc.TeamId);
            await ownerClient.PostAsJsonAsync("/api/documentpermissions", new
            {
                TeamMemberId = editorTeamMemberId,
                DocumentId = doc.Id,
                Role = 1  // Editor
            });

            var content = CreateTxtFormFile("texto do editor", "editor.txt");

            // Act
            var response = await editorClient.PostAsync($"/api/documents/{doc.Id}/context", content);

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task UploadContext_UnsupportedFileType_Returns400()
        {
            // Arrange
            var email = $"ctx-badtype-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var doc = await CreateDocumentAsync(authClient, "Doc Bad Type");

            // Ficheiro com content type não suportado
            var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("conteúdo"));
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/msword");
            var formData = new MultipartFormDataContent();
            formData.Add(fileContent, "file", "document.doc");

            // Act
            var response = await authClient.PostAsync($"/api/documents/{doc.Id}/context", formData);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task UploadContext_NoFile_Returns400()
        {
            // Arrange
            var email = $"ctx-nofile-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var doc = await CreateDocumentAsync(authClient, "Doc No File");

            // Sem ficheiro — body vazio
            var emptyForm = new MultipartFormDataContent();

            // Act
            var response = await authClient.PostAsync($"/api/documents/{doc.Id}/context", emptyForm);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        #endregion

        #region GET /api/documents/{id}/context

        [Fact]
        public async Task GetContextFiles_AsOwner_ReturnsOkWithList()
        {
            // Arrange
            var email = $"ctx-get-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var doc = await CreateDocumentAsync(authClient, "Doc Get Context");

            // Fazer upload de um ficheiro primeiro
            var content = CreateTxtFormFile("conteúdo para listar", "lista.txt");
            await authClient.PostAsync($"/api/documents/{doc.Id}/context", content);

            // Act
            var response = await authClient.GetAsync($"/api/documents/{doc.Id}/context");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var list = await response.Content.ReadFromJsonAsync<List<DocumentContextDto>>();
            Assert.NotNull(list);
            Assert.NotEmpty(list);
            Assert.Equal("lista.txt", list[0].FileName);
        }

        [Fact]
        public async Task GetContextFiles_AsViewer_Returns403()
        {
            // Arrange
            var ownerEmail = $"ctx-get-owner-v-{Guid.NewGuid()}@test.com";
            var viewerEmail = $"ctx-get-viewer-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(viewerEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var viewerToken = await LoginAndGetTokenAsync(viewerEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var viewerClient = CreateAuthenticatedClient(viewerToken);

            var doc = await CreateDocumentAsync(ownerClient, "Doc Get Context Viewer");

            // Adicionar membro com permissão Viewer
            var viewerId = await GetUserIdAsync(viewerEmail);
            await ownerClient.PostAsJsonAsync("/api/teammembers", new
            {
                UserId = viewerId,
                TeamId = doc.TeamId,
                Role = 0
            });
            var viewerTmId = await GetTeamMemberIdAsync(viewerId, doc.TeamId);
            await ownerClient.PostAsJsonAsync("/api/documentpermissions", new
            {
                TeamMemberId = viewerTmId,
                DocumentId = doc.Id,
                Role = 0  // Viewer
            });

            // Act — Viewers não podem listar contextos
            var response = await viewerClient.GetAsync($"/api/documents/{doc.Id}/context");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetContextFiles_AsNonMember_Returns403()
        {
            // Arrange
            var ownerEmail = $"ctx-get-owner-nm-{Guid.NewGuid()}@test.com";
            var otherEmail = $"ctx-get-other-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(otherEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var otherToken = await LoginAndGetTokenAsync(otherEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var otherClient = CreateAuthenticatedClient(otherToken);

            var doc = await CreateDocumentAsync(ownerClient, "Doc Get Context NonMember");

            // Act
            var response = await otherClient.GetAsync($"/api/documents/{doc.Id}/context");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetContextFiles_WithoutAuth_Returns401()
        {
            // Act
            var response = await _client.GetAsync("/api/documents/1/context");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        #endregion

        #region DELETE /api/documents/{id}/context/{contextId}

        [Fact]
        public async Task DeleteContext_AsOwner_Returns204()
        {
            // Arrange
            var email = $"ctx-del-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var doc = await CreateDocumentAsync(authClient, "Doc Delete Context");

            // Fazer upload
            var content = CreateTxtFormFile("ficheiro a eliminar", "delete.txt");
            var uploadResp = await authClient.PostAsync($"/api/documents/{doc.Id}/context", content);
            var uploaded = await uploadResp.Content.ReadFromJsonAsync<DocumentContextDto>();

            // Act
            var response = await authClient.DeleteAsync($"/api/documents/{doc.Id}/context/{uploaded!.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            // Confirmar que foi removido da listagem
            var listResp = await authClient.GetAsync($"/api/documents/{doc.Id}/context");
            var list = await listResp.Content.ReadFromJsonAsync<List<DocumentContextDto>>();
            Assert.DoesNotContain(list!, c => c.Id == uploaded.Id);
        }

        [Fact]
        public async Task DeleteContext_AsEditor_Returns204()
        {
            // Arrange
            var ownerEmail = $"ctx-del-owner-e-{Guid.NewGuid()}@test.com";
            var editorEmail = $"ctx-del-editor-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(editorEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var editorToken = await LoginAndGetTokenAsync(editorEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var editorClient = CreateAuthenticatedClient(editorToken);

            var doc = await CreateDocumentAsync(ownerClient, "Doc Delete Context Editor");

            // Adicionar editor
            var editorId = await GetUserIdAsync(editorEmail);
            await ownerClient.PostAsJsonAsync("/api/teammembers", new
            {
                UserId = editorId,
                TeamId = doc.TeamId,
                Role = 0
            });
            var editorTmId = await GetTeamMemberIdAsync(editorId, doc.TeamId);
            await ownerClient.PostAsJsonAsync("/api/documentpermissions", new
            {
                TeamMemberId = editorTmId,
                DocumentId = doc.Id,
                Role = 1  // Editor
            });

            // Owner faz upload
            var content = CreateTxtFormFile("ficheiro a eliminar pelo editor", "editor-delete.txt");
            var uploadResp = await ownerClient.PostAsync($"/api/documents/{doc.Id}/context", content);
            var uploaded = await uploadResp.Content.ReadFromJsonAsync<DocumentContextDto>();

            // Act — Editor elimina
            var response = await editorClient.DeleteAsync($"/api/documents/{doc.Id}/context/{uploaded!.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task DeleteContext_AsViewer_Returns403()
        {
            // Arrange
            var ownerEmail = $"ctx-del-owner-v-{Guid.NewGuid()}@test.com";
            var viewerEmail = $"ctx-del-viewer-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(viewerEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var viewerToken = await LoginAndGetTokenAsync(viewerEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var viewerClient = CreateAuthenticatedClient(viewerToken);

            var doc = await CreateDocumentAsync(ownerClient, "Doc Delete Context Viewer");

            // Adicionar viewer
            var viewerId = await GetUserIdAsync(viewerEmail);
            await ownerClient.PostAsJsonAsync("/api/teammembers", new
            {
                UserId = viewerId,
                TeamId = doc.TeamId,
                Role = 0
            });
            var viewerTmId = await GetTeamMemberIdAsync(viewerId, doc.TeamId);
            await ownerClient.PostAsJsonAsync("/api/documentpermissions", new
            {
                TeamMemberId = viewerTmId,
                DocumentId = doc.Id,
                Role = 0  // Viewer
            });

            // Owner faz upload
            var content = CreateTxtFormFile("ficheiro protegido", "protected.txt");
            var uploadResp = await ownerClient.PostAsync($"/api/documents/{doc.Id}/context", content);
            var uploaded = await uploadResp.Content.ReadFromJsonAsync<DocumentContextDto>();

            // Act — Viewer tenta eliminar
            var response = await viewerClient.DeleteAsync($"/api/documents/{doc.Id}/context/{uploaded!.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task DeleteContext_WrongContextId_Returns404()
        {
            // Arrange
            var email = $"ctx-del-notfound-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var doc = await CreateDocumentAsync(authClient, "Doc Delete Context NotFound");

            // Act
            var response = await authClient.DeleteAsync($"/api/documents/{doc.Id}/context/999999");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task DeleteContext_StorageServiceIsCalled()
        {
            // Arrange
            var email = $"ctx-del-storage-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var doc = await CreateDocumentAsync(authClient, "Doc Storage Delete Check");

            var storageService = _factory.Services.GetRequiredService<TestStorageService>();
            storageService.Reset();

            var content = CreateTxtFormFile("ficheiro para verificar storage", "storage-check.txt");
            var uploadResp = await authClient.PostAsync($"/api/documents/{doc.Id}/context", content);
            var uploaded = await uploadResp.Content.ReadFromJsonAsync<DocumentContextDto>();

            Assert.Single(storageService.UploadedContextPaths);

            // Act
            await authClient.DeleteAsync($"/api/documents/{doc.Id}/context/{uploaded!.Id}");

            // Assert — storage foi chamado para eliminar
            Assert.Single(storageService.DeletedContextPaths);
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

        private async Task<DocumentDto> CreateDocumentAsync(HttpClient client, string title)
        {
            var request = new CreateDocumentRequest
            {
                Title = title,
                TeamName = $"Team {title} {Guid.NewGuid()}"
            };
            var resp = await client.PostAsJsonAsync("/api/documents", request);
            resp.EnsureSuccessStatusCode();
            return (await resp.Content.ReadFromJsonAsync<DocumentDto>())!;
        }

        private async Task<string> GetUserIdAsync(string email)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? "";
        }

        private async Task<int> GetTeamMemberIdAsync(string userId, int teamId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var member = await db.TeamMember.FirstOrDefaultAsync(m => m.UserId == userId && m.TeamId == teamId);
            return member?.Id ?? 0;
        }

        /// <summary>
        /// Cria um MultipartFormDataContent com um ficheiro TXT.
        /// </summary>
        private static MultipartFormDataContent CreateTxtFormFile(string textContent, string fileName)
        {
            var bytes = Encoding.UTF8.GetBytes(textContent);
            var fileContent = new ByteArrayContent(bytes);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");

            var formData = new MultipartFormDataContent();
            formData.Add(fileContent, "file", fileName);
            return formData;
        }

        #endregion
    }
}
