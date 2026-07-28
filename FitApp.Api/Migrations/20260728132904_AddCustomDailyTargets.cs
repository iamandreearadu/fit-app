using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomDailyTargets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "CustomCaloriesTarget",
                table: "Users",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomStepsTarget",
                table: "Users",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CustomWaterTargetL",
                table: "Users",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CaloriesTarget",
                table: "DailyEntries",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "WaterTargetL",
                table: "DailyEntries",
                type: "REAL",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomCaloriesTarget",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CustomStepsTarget",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CustomWaterTargetL",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CaloriesTarget",
                table: "DailyEntries");

            migrationBuilder.DropColumn(
                name: "WaterTargetL",
                table: "DailyEntries");
        }
    }
}
