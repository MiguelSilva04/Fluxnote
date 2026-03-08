using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fluxnotebackend.Migrations
{
    /// <inheritdoc />
    public partial class documentComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DocumentComments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocumentId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RangeIndex = table.Column<int>(type: "int", nullable: true),
                    RangeLength = table.Column<int>(type: "int", nullable: true),
                    Resolved = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByColor = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedById = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DocumentCommentId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentComments_AspNetUsers_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DocumentComments_DocumentComments_DocumentCommentId",
                        column: x => x.DocumentCommentId,
                        principalTable: "DocumentComments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DocumentComments_Document_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Document",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentComments_CreatedById",
                table: "DocumentComments",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentComments_DocumentCommentId",
                table: "DocumentComments",
                column: "DocumentCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentComments_DocumentId",
                table: "DocumentComments",
                column: "DocumentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentComments");
        }
    }
}
