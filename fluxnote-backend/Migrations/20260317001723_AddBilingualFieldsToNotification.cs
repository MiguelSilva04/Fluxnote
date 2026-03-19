using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fluxnotebackend.Migrations
{
    /// <inheritdoc />
    public partial class AddBilingualFieldsToNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MessagePt",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TitlePt",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MessagePt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "TitlePt",
                table: "Notifications");
        }
    }
}
