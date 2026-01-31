using System.Net;
using System.Net.Http.Json;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Fluxnote.Backend.IntegrationTests
{
    public class TeamMembersControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;

        public TeamMembersControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetTeamMembers_ReturnsOk()
        {
            var response = await _client.GetAsync("/api/teammembers");

            response.EnsureSuccessStatusCode();
            var members = await response.Content.ReadFromJsonAsync<List<TeamMember>>();

            Assert.NotNull(members);
        }

        [Fact]
        public async Task PostTeamMember_CreatesMember()
        {
            var member = new TeamMember
            {
                Name = "user teste",
                Role = 0
            };

            var response = await _client.PostAsJsonAsync("/api/TeamMembers", member);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var created = await response.Content.ReadFromJsonAsync<TeamMember>();
            Assert.NotNull(created);
            Assert.Equal("user teste", created!.Name);
            Assert.Equal(TeamRole.Member, created.Role);
        }

        [Fact]
        public async Task GetTeamMemberById_ReturnsMember()
        {
            var member = new TeamMember
            {
                Name = "GetById User",
                Role = TeamRole.TeamAdmin
            };

            var postResponse = await _client.PostAsJsonAsync("/api/teammembers", member);
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            var response = await _client.GetAsync($"/api/teammembers/{created!.Id}");

            response.EnsureSuccessStatusCode();
            var fetched = await response.Content.ReadFromJsonAsync<TeamMember>();

            Assert.NotNull(fetched);
            Assert.Equal(created.Id, fetched!.Id);
            Assert.Equal("GetById User", fetched.Name);
        }

        [Fact]
        public async Task PutTeamMember_UpdatesMember()
        {
            var member = new TeamMember
            {
                Name = "Old Name",
                Role = TeamRole.Member
            };

            var postResponse = await _client.PostAsJsonAsync("/api/teammembers", member);
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            created!.Name = "Updated Name";
            created.Role = TeamRole.Owner;

            var putResponse = await _client.PutAsJsonAsync($"/api/teammembers/{created.Id}", created);

            Assert.Equal(HttpStatusCode.NoContent, putResponse.StatusCode);

            var getResponse = await _client.GetAsync($"/api/teammembers/{created.Id}");
            var updated = await getResponse.Content.ReadFromJsonAsync<TeamMember>();

            Assert.Equal("Updated Name", updated!.Name);
            Assert.Equal(TeamRole.Owner, updated.Role);
        }

        [Fact]
        public async Task DeleteTeamMember_RemovesMember()
        {
            var member = new TeamMember
            {
                Name = "To Delete",
                Role = TeamRole.Member
            };

            var postResponse = await _client.PostAsJsonAsync("/api/teammembers", member);
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            var deleteResponse = await _client.DeleteAsync($"/api/teammembers/{created!.Id}");

            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            var getResponse = await _client.GetAsync($"/api/teammembers/{created.Id}");
            Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        }
    }
}
