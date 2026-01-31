//using Fluxnote.Backend.Models;
//using Microsoft.EntityFrameworkCore;

//namespace Fluxnote.Backend.Data
//{
//    public class SeedData
//{
//        public static void Initialize(IServiceProvider serviceProvider)
//        {
//            using var context = new FluxnoteServerContext(
//                serviceProvider.GetRequiredService<DbContextOptions<FluxnoteServerContext>>());

//            // Se já existem produtos, não faz seed
//            if (context.Team.Any())
//                return;
            
//            //context.Person.AddRange(
//            //    new Person { Name = "Alex Morgan", Email = "alex.morgan@fluxnote.com" },
//            //    new Person { Name = "Sarah Kim", Email = "sarah.kim@fluxnote.com" },
//            //    new Person { Name = "John Doe", Email = "john.doe@fluxnote.com" },
//            //    new Person { Name = "Maria Santos", Email = "maria.santos@fluxnote.com" }
//            //);
//            //context.Team.AddRange(
//            //    new Team { Name = "Keyboard", Price = 29.99m, Stock = 10, Category = "Peripherals" },
//            //    new Team { Name = "Mouse", Price = 19.99m, Stock = 25, Category = "Peripherals" },
//            //    new Team { Name = "Monitor", Price = 199.99m, Stock = 5, Category = "Displays" },
//            //    new Team { Name = "Laptop", Price = 899m, Stock = 3, Category = "Computers" }
//            //);

//            context.Team.AddRange(
//                new Team
//                {
//                    Name = "Projeto Alfa",
//                    CreatedAt = DateTime.Now.AddMonths(-3),
//                    OwnerId=1,
//                    Documents = new List<Document>
//                    {
//                        new Document
//                        {
//                            Title = "Plano de Projeto Alfa"
//                        },
//                        new Document
//                        {
//                            Title = "Relatório Semanal Q3"
//                        },
//                        new Document
//                        {
//                            Title = "Apresentação de Clientes"
//                        }
//                    }
//                },
//                new Team
//                {
//                    Name = "Desenvolvimento Beta",
//                    CreatedAt = DateTime.Now.AddMonths(-2),
//                    //Documents = new List<Document>()
//                },
//                new Team
//                {
//                    Name = "Marketing Gamma",
//                    CreatedAt = DateTime.Now.AddMonths(-1),
//                    //Documents = new List<Document>()
//                },
//                new Team
//                {
//                    Name = "Suporte Delta",
//                    CreatedAt = DateTime.Now.AddHours(-3),
//                    //Documents = new List<Document>()
//                }
//            );

//            var user1Id = "00000000-0000-0000-0000-000000000001";
//            var user2Id = "00000000-0000-0000-0000-000000000002";
//            var user3Id = "00000000-0000-0000-0000-000000000003";
//            var user4Id = "00000000-0000-0000-0000-000000000004";

//            context.Users.AddRange(
//                new User { FullName = "Maestro", Id = user1Id },
//                new User { FullName = "Zé Admin", Id= user2Id },
//                new User { FullName = "Martim", Id = user3Id },
//                new User { FullName = "Marcelo", Id= user4Id }

//            );

//            context.TeamMember.AddRange(
//                new TeamMember { TeamId = 1, Name = "MaestroMember", Role = TeamRole.Owner, UserId = user1Id},
//                new TeamMember { TeamId = 1, Name = "ZéMember", Role = TeamRole.TeamAdmin, UserId = user2Id },
//                new TeamMember { TeamId = 1, Name = "MartimMember", Role = TeamRole.Member, UserId = user3Id},
//                new TeamMember { TeamId = 1, Name = "MarceloMember", Role = TeamRole.Member, UserId = user4Id }
//            );

//            //context.Document.AddRange(
//            //    new Document { TeamId = 1, Title = "Plano de Projeto Alfa"},
//            //    new Document { TeamId = 1, Title = "Relatório Semanal Q3"},
//            //    new Document { TeamId = 1, Title = "Apresentação de Clientes" }
//            //);




//            context.SaveChanges();


//        }
//    }
//}
