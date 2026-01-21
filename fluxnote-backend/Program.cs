using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Fluxnote.Backend.Data;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<FluxnoteServerContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("FluxnoteServerContext") ?? throw new InvalidOperationException("Connection string 'FluxnoteServerContext' not found.")));

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Inserts Seed & Auto-apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<FluxnoteServerContext>();
    db.Database.Migrate();
    SeedData.Initialize(services);   
}



app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
