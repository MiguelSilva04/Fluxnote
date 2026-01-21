using Fluxnote.Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Fluxnote.Backend.Data
{
    public class SeedData
{
        public static void Initialize(IServiceProvider serviceProvider)
        {
            using var context = new FluxnoteServerContext(
                serviceProvider.GetRequiredService<DbContextOptions<FluxnoteServerContext>>());

            // Se já existem produtos, não faz seed
            if (context.Team.Any())
                return;
            
            context.Person.AddRange(
                new Person { Name = "Alex Morgan", Email = "alex.morgan@fluxnote.com" },
                new Person { Name = "Sarah Kim", Email = "sarah.kim@fluxnote.com" },
                new Person { Name = "John Doe", Email = "john.doe@fluxnote.com" },
                new Person { Name = "Maria Santos", Email = "maria.santos@fluxnote.com" }
            );
            //context.Team.AddRange(
            //    new Team { Name = "Keyboard", Price = 29.99m, Stock = 10, Category = "Peripherals" },
            //    new Team { Name = "Mouse", Price = 19.99m, Stock = 25, Category = "Peripherals" },
            //    new Team { Name = "Monitor", Price = 199.99m, Stock = 5, Category = "Displays" },
            //    new Team { Name = "Laptop", Price = 899m, Stock = 3, Category = "Computers" }
            //);

            context.Team.AddRange(
                new Team
                {
                    Name = "Projeto Alfa",
                    MemberCount = 7,
                    CreatedAt = DateTime.Now.AddMonths(-3),
                    //Documents = new List<Document>
                    //{
                    //    new Document
                    //    {
                    //        Id = 1,
                    //        Name = "Plano de Projeto Alfa",
                    //        LastEdited = "Yesterday",
                    //        MyRole = "Owner"
                    //    },
                    //    new Document
                    //    {
                    //        Id = 2,
                    //        Name = "Relatório Semanal Q3",
                    //        LastEdited = "3 days ago",
                    //        MyRole = "Editor"
                    //    },
                    //    new Document
                    //    {
                    //        Id = 3,
                    //        Name = "Apresentação de Clientes",
                    //        LastEdited = "1 week ago",
                    //        MyRole = "Viewer"
                    //    }
                    //}
                },
                new Team
                {
                    Name = "Desenvolvimento Beta",
                    MemberCount = 12,
                    CreatedAt = DateTime.Now.AddMonths(-2),
                    //Documents = new List<Document>()
                },
                new Team
                {
                    Name = "Marketing Gamma",
                    MemberCount = 5,
                    CreatedAt = DateTime.Now.AddMonths(-1),
                    //Documents = new List<Document>()
                },
                new Team
                {
                    Name = "Suporte Delta",
                    MemberCount = 8,
                    CreatedAt = DateTime.Now.AddHours(-3),
                    //Documents = new List<Document>()
                }
            );

            context.TeamMember.AddRange(
                new TeamMember { TeamId = 1, PersonId = 1, Role = "Owner" },
                new TeamMember { TeamId = 1, PersonId = 2, Role = "Team Admin" },
                new TeamMember { TeamId = 1, PersonId = 3, Role = "Editor" },
                new TeamMember { TeamId = 1, PersonId = 4, Role = "Viewer" }
            );

            context.SaveChanges();



            context.SaveChanges();
        }
    }
}
