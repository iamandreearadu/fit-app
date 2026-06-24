using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Posts_UserId_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_MealEntries_UserId",
                table: "MealEntries");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_UserId_IsArchived_CreatedAt",
                table: "Posts",
                columns: new[] { "UserId", "IsArchived", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MealEntries_UserId_Date",
                table: "MealEntries",
                columns: new[] { "UserId", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Posts_UserId_IsArchived_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_MealEntries_UserId_Date",
                table: "MealEntries");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_UserId_CreatedAt",
                table: "Posts",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MealEntries_UserId",
                table: "MealEntries",
                column: "UserId");
        }
    }
}
