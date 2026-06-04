using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserVerificationFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSystemAccount",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSystemAccount",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "Users");
        }
    }
}
