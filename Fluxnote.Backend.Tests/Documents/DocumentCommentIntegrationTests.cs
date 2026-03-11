using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace Fluxnote.Backend.Tests.Documents
{

    public class DocumenCommentIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public DocumenCommentIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }


        [Fact]
        public async Task GetComments_ReturnsComments()
        {
            // Arrange - Preparar utilizador e criar documento
            var email = $"doc-getid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar um documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "New Document",
                TeamName = "New Team"
            };
            var createDocumentResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDocument = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var commentDto = new CreateDocumentCommentDto
            {
                DocumentId = createdDocument!.Id,
                UserId = await GetUserIdAsync(email),
                Content = "Test comment for Get",
                CreatedByColor = "#0000FF"
            };
            var createdCommentResponse = await authClient.PostAsJsonAsync($"/api/documents/{createdDocument!.Id}/comments", commentDto);
            var createdComment = await createdCommentResponse.Content.ReadFromJsonAsync<DocumentCommentDto>();

            //Act - Obter comentários do documento
            var response = await authClient.GetAsync($"/api/documents/{createdDocument!.Id}/comments");

            //Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var comments = await response.Content.ReadFromJsonAsync<List<DocumentCommentDto>>();
            Assert.NotNull(comments);
        }

        [Fact]
        public async Task GetComments_AsNonMember_ReturnsForbidden()
        {
            // Arrange - Criar dois utilizadores
            var ownerEmail = $"doc-owner2-{Guid.NewGuid()}@test.com";
            var otherEmail = $"doc-other-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(otherEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var otherToken = await LoginAndGetTokenAsync(otherEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var otherClient = CreateAuthenticatedClient(otherToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Private Document",
                TeamName = "Private Team"
            };
            var createDocumentResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var commentDto = new CreateDocumentCommentDto
            {
                DocumentId = createdDoc!.Id,
                UserId = await GetUserIdAsync(ownerEmail),
                Content = "Test comment for Get",
                CreatedByColor = "#0000FF"
            };
            var createdCommentResponse = await ownerClient.PostAsJsonAsync($"/api/documents/{createdDoc!.Id}/comments", commentDto);
            var createdComment = await createdCommentResponse.Content.ReadFromJsonAsync<DocumentCommentDto>();

            //Act - Outro utilizador tenta obter comentários do documento privado
            var response = await otherClient.GetAsync($"/api/documents/{createdDoc!.Id}/comments");

            //Assert - Deve retornar Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }


        [Fact]
        public async Task CreateComment_ReturnsComment()
        {
            // Arrange - Preparar utilizador e criar documento
            var email = $"doc-getid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar um documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Comment to Create",
                TeamName = "Team for Create"
            };
            var createDocumentResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDocument = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var dto = new CreateDocumentCommentDto
            {
                DocumentId = createdDocument!.Id,
                UserId = await GetUserIdAsync(email),
                Content = "Test comment for Get",
                CreatedByColor = "#0000FF"
            };

            //Act - Criar comentário
            var response = await authClient.PostAsJsonAsync($"/api/documents/{createdDocument!.Id}/comments", dto);

            //Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<DocumentCommentDto>();
            Assert.NotNull(result);
            Assert.Equal("Test comment for Get", result!.Content);
        }

        [Fact]
        public async Task CreateReply_AttachesToParentComment()
        {
            var email = "reply@test.com";
            var password = "Test123!";

            await CreateAndConfirmUserAsync(email, password);
            var token = await LoginAndGetTokenAsync(email, password);

            var client = CreateAuthenticatedClient(token);
            var userId = await GetUserIdAsync(email);

            // Criar um documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Comment to Get by ID",
                TeamName = "Team for GetById"
            };
            var createDocumentResponse = await client.PostAsJsonAsync("/api/documents", docRequest);
            var createdDocument = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var parentComment = new CreateDocumentCommentDto
            {
                DocumentId = createdDocument!.Id,
                UserId = await GetUserIdAsync(email),
                Content = "Parent Comment",
                CreatedByColor = "#0000FF"
            };

            var parentResp = await client.PostAsJsonAsync($"/api/documents/{createdDocument!.Id}/comments", parentComment);
            var parent = await parentResp.Content.ReadFromJsonAsync<DocumentCommentDto>();

            var reply = new CreateDocumentCommentDto
            {
                DocumentId = createdDocument!.Id,
                UserId = userId,
                Content = "Reply comment",
                ParentCommentId = parent!.Id
            };

            var response = await client.PostAsJsonAsync($"/api/documents/{createdDocument!.Id}/comments", reply);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var result = await response.Content.ReadFromJsonAsync<DocumentCommentDto>();

            Assert.Equal(parent.Id, result!.ParentCommentId);
        }

        [Fact]
        public async Task ResolveComment_TogglesResolved()
        {
            // Arrange - Preparar utilizador e criar documento
            var email = $"doc-getid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar um documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Comment to Create",
                TeamName = "Team for Create"
            };
            var createDocumentResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDocument = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var dto = new CreateDocumentCommentDto
            {
                DocumentId = createdDocument!.Id,
                UserId = await GetUserIdAsync(email),
                Content = "Test comment for Get",
                CreatedByColor = "#0000FF"
            };

            var createResp = await authClient.PostAsJsonAsync($"/api/documents/{createdDocument!.Id}/comments", dto);
            var comment = await createResp.Content.ReadFromJsonAsync<DocumentCommentDto>();

            //Act - Resolver comentário
            var response = await authClient.PatchAsync($"/api/documents/{createdDocument!.Id}/comments/{comment!.Id}/resolve", null);

            //Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.Content.ReadFromJsonAsync<DocumentCommentDto>();
            Assert.True(updated!.Resolved);
        }

        #region Delete Comment Tests

        [Fact]
        public async Task DeleteComment_ReturnsNoContent()
        {
            // Arrange - Preparar utilizador e criar documento
            var email = $"doc-getid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar um documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Comment to Create",
                TeamName = "Team for Create"
            };
            var createDocumentResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDocument = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentDto>();

            var dto = new CreateDocumentCommentDto
            {
                DocumentId = createdDocument!.Id,
                UserId = await GetUserIdAsync(email),
                Content = "Test comment for Get",
                CreatedByColor = "#0000FF"
            };

            var createResp = await authClient.PostAsJsonAsync($"/api/documents/{createdDocument!.Id}/comments", dto);
            var comment = await createResp.Content.ReadFromJsonAsync<DocumentCommentDto>();

            var response = await authClient.DeleteAsync($"/api/documents/{createdDocument!.Id}/comments/{comment!.Id}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task DeleteComment_AsNonAuthorOrNonAdmin_ReturnsForbidden()
        {
            var email1 = "user1@test.com";
            var email2 = "user2@test.com";
            var password = "Test123!";

            await CreateAndConfirmUserAsync(email1, password);
            await CreateAndConfirmUserAsync(email2, password);

            var token1 = await LoginAndGetTokenAsync(email1, password);
            var token2 = await LoginAndGetTokenAsync(email2, password);

            var client1 = CreateAuthenticatedClient(token1);
            var client2 = CreateAuthenticatedClient(token2);

            var userId1 = await GetUserIdAsync(email1);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Comment to Create",
                TeamName = "Team for Create"
            };
            var createDocumentResponse = await client1.PostAsJsonAsync("/api/documents", docRequest);
            var createdDocument = await createDocumentResponse.Content.ReadFromJsonAsync<DocumentDto>();


            var dto = new CreateDocumentCommentDto
            {
                DocumentId = createdDocument!.Id,
                UserId = userId1,
                Content = "Protected comment"
            };

            var createResp = await client1.PostAsJsonAsync($"/api/documents/{createdDocument!.Id}/comments", dto);
            var comment = await createResp.Content.ReadFromJsonAsync<DocumentCommentDto>();

            var response = await client2.DeleteAsync($"/api/documents/{createdDocument!.Id}/comments/{comment!.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? "";
        }

        #endregion
    }

}
