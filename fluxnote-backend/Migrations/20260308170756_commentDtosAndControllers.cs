using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fluxnotebackend.Migrations
{
    /// <inheritdoc />
    public partial class commentDtosAndControllers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DocumentComments_AspNetUsers_CreatedById",
                table: "DocumentComments");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentComments_DocumentComments_DocumentCommentId",
                table: "DocumentComments");

            migrationBuilder.DropIndex(
                name: "IX_DocumentComments_CreatedById",
                table: "DocumentComments");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "DocumentComments");

            migrationBuilder.RenameColumn(
                name: "DocumentCommentId",
                table: "DocumentComments",
                newName: "ParentCommentId");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentComments_DocumentCommentId",
                table: "DocumentComments",
                newName: "IX_DocumentComments_ParentCommentId");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "DocumentComments",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentComments_UserId",
                table: "DocumentComments",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentComments_AspNetUsers_UserId",
                table: "DocumentComments",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentComments_DocumentComments_ParentCommentId",
                table: "DocumentComments",
                column: "ParentCommentId",
                principalTable: "DocumentComments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DocumentComments_AspNetUsers_UserId",
                table: "DocumentComments");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentComments_DocumentComments_ParentCommentId",
                table: "DocumentComments");

            migrationBuilder.DropIndex(
                name: "IX_DocumentComments_UserId",
                table: "DocumentComments");

            migrationBuilder.RenameColumn(
                name: "ParentCommentId",
                table: "DocumentComments",
                newName: "DocumentCommentId");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentComments_ParentCommentId",
                table: "DocumentComments",
                newName: "IX_DocumentComments_DocumentCommentId");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "DocumentComments",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<string>(
                name: "CreatedById",
                table: "DocumentComments",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentComments_CreatedById",
                table: "DocumentComments",
                column: "CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentComments_AspNetUsers_CreatedById",
                table: "DocumentComments",
                column: "CreatedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentComments_DocumentComments_DocumentCommentId",
                table: "DocumentComments",
                column: "DocumentCommentId",
                principalTable: "DocumentComments",
                principalColumn: "Id");
        }
    }
}
