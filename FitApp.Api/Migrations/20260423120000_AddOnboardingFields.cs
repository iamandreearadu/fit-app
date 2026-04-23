using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "OnboardingCompleted",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "DietaryPreference",
                table: "Users",
                type: "TEXT",
                nullable: true);

            // Existing users with profile data are considered already onboarded
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"OnboardingCompleted\" = 1 WHERE \"Age\" > 0 OR \"HeightCm\" > 0 OR LENGTH(\"Goal\") > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "OnboardingCompleted", table: "Users");
            migrationBuilder.DropColumn(name: "DietaryPreference", table: "Users");
        }
    }
}
