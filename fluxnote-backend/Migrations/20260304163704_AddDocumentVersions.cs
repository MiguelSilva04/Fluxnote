using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fluxnotebackend.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentVersions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DocumentVersion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocumentId = table.Column<int>(type: "int", nullable: false),
                    AuthorId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AuthorName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    YDocSnapshot = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    ContentHtml = table.Column<byte[]>(type: "varbinary(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentVersion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentVersion_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DocumentVersion_Document_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Document",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVersion_AuthorId",
                table: "DocumentVersion",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVersion_CreatedAt",
                table: "DocumentVersion",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVersion_DocumentId",
                table: "DocumentVersion",
                column: "DocumentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentVersion");
        }
    }
}
