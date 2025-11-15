using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @colExists := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Users'
                      AND COLUMN_NAME = 'Role'
                );
                SET @dropSql := IF(@colExists > 0, 'ALTER TABLE `Users` DROP COLUMN `Role`;', 'SELECT 1');
                PREPARE stmt FROM @dropSql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "Users",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("8A8EF3AC-2C98-489A-A7D0-53C51DBF7ADB"),
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Name = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(@"
                INSERT INTO `Roles` (`Id`, `Name`, `Description`, `CreatedAt`)
                VALUES
                    ('8A8EF3AC-2C98-489A-A7D0-53C51DBF7ADB', 'Admin', 'Full administrative access', UTC_TIMESTAMP()),
                    ('C6AB4494-9FD4-4E58-8BB5-A9311FC22B1F', 'User', 'Standard operator access', UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE Name = VALUES(Name);
            ");

            migrationBuilder.Sql(@"
                UPDATE `Users`
                SET `RoleId` = '8A8EF3AC-2C98-489A-A7D0-53C51DBF7ADB'
                WHERE `RoleId` = '00000000-0000-0000-0000-000000000000';
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Name",
                table: "Roles",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users",
                column: "RoleId",
                principalTable: "Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropIndex(
                name: "IX_Users_RoleId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "Users");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Users",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
