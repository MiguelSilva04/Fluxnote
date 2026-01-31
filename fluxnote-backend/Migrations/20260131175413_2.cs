using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace fluxnotebackend.Migrations
{
    /// <inheritdoc />
    public partial class _2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Document",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<byte[]>(
                name: "Content",
                table: "Document",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Document",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedById",
                table: "Document",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Document",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Document",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PlainText",
                table: "Document",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Document",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_Document_CreatedById",
                table: "Document",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Document_IsDeleted",
                table: "Document",
                column: "IsDeleted");

            migrationBuilder.AddForeignKey(
                name: "FK_Document_AspNetUsers_CreatedById",
                table: "Document",
                column: "CreatedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Document_AspNetUsers_CreatedById",
                table: "Document");

            migrationBuilder.DropIndex(
                name: "IX_Document_CreatedById",
                table: "Document");

            migrationBuilder.DropIndex(
                name: "IX_Document_IsDeleted",
                table: "Document");

            migrationBuilder.DropColumn(
                name: "Content",
                table: "Document");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Document");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Document");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Document");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Document");

            migrationBuilder.DropColumn(
                name: "PlainText",
                table: "Document");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Document");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Document",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);
        }
    }
}
