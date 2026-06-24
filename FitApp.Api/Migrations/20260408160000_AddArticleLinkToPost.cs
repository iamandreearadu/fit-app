using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitApp.Api.Migrations
{
    [Microsoft.EntityFrameworkCore.Infrastructure.DbContext(typeof(FitApp.Api.Data.AppDbContext))]
    [Microsoft.EntityFrameworkCore.Migrations.Migration("20260408160000_AddArticleLinkToPost")]
    public partial class AddArticleLinkToPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ArticleId",
                table: "Posts",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Posts_ArticleId",
                table: "Posts",
                column: "ArticleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Posts_ArticleId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "ArticleId",
                table: "Posts");
        }
    }
}
