using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fluxnotebackend.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentInvite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DocumentInvite",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Token = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DocumentId = table.Column<int>(type: "int", nullable: false),
                    CreatedByTeamMemberId = table.Column<int>(type: "int", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsRevoked = table.Column<bool>(type: "bit", nullable: false),
                    UsedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentInvite", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentInvite_Document_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Document",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentInvite_TeamMember_CreatedByTeamMemberId",
                        column: x => x.CreatedByTeamMemberId,
                        principalTable: "TeamMember",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentInvite_CreatedByTeamMemberId",
                table: "DocumentInvite",
                column: "CreatedByTeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentInvite_DocumentId",
                table: "DocumentInvite",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentInvite_ExpiresAt",
                table: "DocumentInvite",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentInvite_Token",
                table: "DocumentInvite",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentInvite");
        }
    }
}
