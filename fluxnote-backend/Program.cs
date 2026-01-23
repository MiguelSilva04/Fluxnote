using FluentValidation;
using FluentValidation.AspNetCore;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Auth;
using Fluxnote.Backend.Services.Email;
using Fluxnote.Backend.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;


var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<FluxnoteServerContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("FluxnoteServerContext") ?? throw new InvalidOperationException("Connection string 'FluxnoteServerContext' not found.")));

var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key missing (Jwt__Key).");


// Add services to the container.

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("EmailOptions"));

// Caso tivessemos um serviço de email real, aqui é onde separariamos os ambientes
/*if (builder.Environment.IsDevelopment())
    builder.Services.AddScoped<IEmailSender, ConsoleEmailSender>();
else
    builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();*/

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IDevEmailStore, DevEmailStore>();
    builder.Services.AddScoped<IEmailSender, ConsoleEmailSender>();
}

builder.Services.AddScoped<IEmailSender, ConsoleEmailSender>();


builder.Services.AddScoped<TokenService>();

builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.User.RequireUniqueEmail = true;

    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
})
.AddEntityFrameworkStores<FluxnoteServerContext>()
.AddDefaultTokenProviders();

builder.Services.AddControllers();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy =>
    {
        policy.WithOrigins(
            "http://localhost:4200",
            "http://127.0.0.1:4200"
            )
               .AllowAnyHeader()
               .AllowAnyMethod()
               .AllowCredentials();
    });
});
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();


// Auto-apply migrations on startup (avoid in tests)
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
    db.Database.Migrate();
}


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
    app.UseDeveloperExceptionPage();
}

app.UseCors("spa");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
