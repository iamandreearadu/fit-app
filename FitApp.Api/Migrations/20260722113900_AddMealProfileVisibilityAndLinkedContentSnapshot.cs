using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMealProfileVisibilityAndLinkedContentSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LinkedContentSubtitle",
                table: "Posts",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedContentTitle",
                table: "Posts",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedContentType",
                table: "Posts",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHiddenFromProfile",
                table: "MealEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_MealEntries_UserId_IsHiddenFromProfile_CreatedAt",
                table: "MealEntries",
                columns: new[] { "UserId", "IsHiddenFromProfile", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MealEntries_UserId_IsHiddenFromProfile_CreatedAt",
                table: "MealEntries");

            migrationBuilder.DropColumn(
                name: "LinkedContentSubtitle",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "LinkedContentTitle",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "LinkedContentType",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "IsHiddenFromProfile",
                table: "MealEntries");
        }
    }
}
