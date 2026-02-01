using AspNetCoreRateLimit;
using FluentValidation;
using FluentValidation.AspNetCore;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Auth;
using Fluxnote.Backend.Services.Email;
using Fluxnote.Backend.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;


var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<FluxnoteServerContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("FluxnoteServerContext") ?? throw new InvalidOperationException("Connection string 'FluxnoteServerContext' not found.")));

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

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

// Configuração de rate limiting
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

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
else
{
    builder.Services.AddScoped<IEmailSender, ConsoleEmailSender>();
}



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

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = 403;
        return Task.CompletedTask;
    };
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.MaxDepth = 64;
    });

// Increase max request body size for base64 image uploads (5MB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 5 * 1024 * 1024; // 5MB
});
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
               .WithHeaders("Content-Type", "Authorization", "X-Requested-With")
               .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
               .WithExposedHeaders("Retry-After", "X-Rate-Limit-Limit", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset")
               .AllowCredentials();
    });
});
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Inserts Seed & Auto-apply migrations on startup (avoid in tests)
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<FluxnoteServerContext>();
    try
    {
        db.Database.Migrate();
        //SeedData.Initialize(services);   
}


    catch (SqliteException ex)
    {
        // SQLite can throw if migrations are applied against an existing DB schema in some test scenarios.
        // Ignore the specific "table already exists" error so integration tests that reuse an SQLite DB file don't fail.
        if (ex.SqliteErrorCode == 1 && ex.Message?.Contains("already exists", StringComparison.OrdinalIgnoreCase) == true)
        {
            Console.WriteLine($"Ignored Sqlite migration error: {ex.Message}");
        }
        else
        {
            throw;
        }
    }
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

app.UseRouting();

app.UseCors("spa");

app.UseIpRateLimiting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
