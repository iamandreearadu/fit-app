using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedMealTemplateFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSavedMeal",
                table: "MealEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSavedMeal",
                table: "MealEntries");
        }
    }
}
