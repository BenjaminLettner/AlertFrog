using Backend.Constants;
using Backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public static class DbSeeder
{
    private const string AdminEmail = "admin@alertfrog.com";
    private const string AdminPassword = "alertfrog";

    public static async Task EnsureSeedDataAsync(AlertFrogDbContext context, IConfiguration configuration)
    {
        await context.Database.MigrateAsync();

        await EnsureRolesAsync(context);

        if (await context.Users.AnyAsync(u => u.Email == AdminEmail))
        {
            return;
        }

        var admin = new User
        {
            Id = Guid.NewGuid(),
            Name = "System Admin",
            Email = AdminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword),
            RoleId = SystemRoles.AdminId,
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(admin);
        await context.SaveChangesAsync();
    }

    private static async Task EnsureRolesAsync(AlertFrogDbContext context)
    {
        var existingRoles = await context.Roles.ToListAsync();

        var requiredRoles = new List<Role>
        {
            new()
            {
                Id = SystemRoles.AdminId,
                Name = SystemRoles.Admin,
                Description = "Full administrative access"
            },
            new()
            {
                Id = SystemRoles.UserId,
                Name = SystemRoles.User,
                Description = "Standard operator access"
            }
        };

        var rolesToAdd = requiredRoles
            .Where(role => existingRoles.All(r => r.Id != role.Id))
            .ToList();

        if (rolesToAdd.Count == 0)
        {
            return;
        }

        await context.Roles.AddRangeAsync(rolesToAdd);
        await context.SaveChangesAsync();
    }
}
