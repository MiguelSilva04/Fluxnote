using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fluxnotebackend.Migrations
{
    /// <inheritdoc />
    public partial class AddFolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Document_Folder_FolderId",
                table: "Document");

            migrationBuilder.AddForeignKey(
                name: "FK_Document_Folder_FolderId",
                table: "Document",
                column: "FolderId",
                principalTable: "Folder",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Document_Folder_FolderId",
                table: "Document");

            migrationBuilder.AddForeignKey(
                name: "FK_Document_Folder_FolderId",
                table: "Document",
                column: "FolderId",
                principalTable: "Folder",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
