using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NuGet.Protocol.Plugins;
using System.Net;
using System.Net.Http.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.TeamTesting
{
    public class TeamIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;
        public TeamIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetTeams_ReturnsOk()
        {
            var response = await _client.GetAsync("/api/teams");

            response.EnsureSuccessStatusCode();
            var teams = await response.Content.ReadFromJsonAsync<List<Team>>();

            Assert.NotNull(teams);
        }

        [Fact]
        public async Task PostTeam_CreatesTeam()
        {

            var team = new Team
            {
                Name = "Integration Test Team"
            };

            var response = await _client.PostAsJsonAsync("/api/teams", team);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var createdTeam = await response.Content.ReadFromJsonAsync<Team>();
            Assert.NotNull(createdTeam);
            Assert.Equal("Integration Test Team", createdTeam!.Name);

            await _client.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task GetTeamById_ReturnsTeam()
        {
            var team = new Team { Name = "Team GetById" };

            var postResponse = await _client.PostAsJsonAsync("/api/teams", team);
            var created = await postResponse.Content.ReadFromJsonAsync<Team>();

            var response = await _client.GetAsync($"/api/teams/{created!.Id}");
            response.EnsureSuccessStatusCode();
            
            var fetched = await response.Content.ReadFromJsonAsync<Team>();

            Assert.NotNull(fetched);
            Assert.Equal(created.Id, fetched!.Id);

            await _client.DeleteAsync($"/api/teams/{created.Id}");
        }

        [Fact]
        public async Task PutTeam_UpdatesTeam()
        {
            var team = new Team { Name = "nome antigo" };
            var postResponse = await _client.PostAsJsonAsync("/api/teams", team);
            var created = await postResponse.Content.ReadFromJsonAsync<Team>();

            created!.Name = "novo nome";

            var putResponse = await _client.PutAsJsonAsync($"/api/teams/{created.Id}", created);

            Assert.Equal(HttpStatusCode.NoContent, putResponse.StatusCode);

            var getResponse = await _client.GetAsync($"/api/teams/{created.Id}");
            var updated = await getResponse.Content.ReadFromJsonAsync<Team>();

            Assert.Equal("novo nome", updated!.Name);

            await _client.DeleteAsync($"/api/teams/{created.Id}");
        }

        [Fact]
        public async Task DeleteTeam_RemovesTeam()
        {
            var team = new Team { Name = "para Deletar" };
            var postResponse = await _client.PostAsJsonAsync("/api/teams", team);
            var created = await postResponse.Content.ReadFromJsonAsync<Team>();

            var deleteResponse = await _client.DeleteAsync($"/api/teams/{created!.Id}");

            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            var getResponse = await _client.GetAsync($"/api/teams/{created.Id}");
            Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        }


    }
}
