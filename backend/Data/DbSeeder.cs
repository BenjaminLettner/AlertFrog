using Backend.Constants;
using Backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public static class DbSeeder
{
    private const string AdminEmail = "admin@alertfrog.com";
    private const string AdminPassword = "alertfrog";
    private const string FirstLevelEmail = "tier1@alertfrog.com";
    private const string SecondLevelEmail = "tier2@alertfrog.com";
    private const string AnalystEmail = "analyst@alertfrog.com";
    private const string DefaultPassword = "alertfrog";

    public static async Task EnsureSeedDataAsync(AlertFrogDbContext context, IConfiguration configuration)
    {
        await context.Database.MigrateAsync();

        await EnsureRolesAsync(context);
        await EnsureAdminAsync(context);
        await EnsureSupportUsersAsync(context);
        await EnsureIncidentsAsync(context);
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
            },
            new()
            {
                Id = SystemRoles.FirstLevelId,
                Name = SystemRoles.FirstLevel,
                Description = "Tier 1 SOC analyst"
            },
            new()
            {
                Id = SystemRoles.SecondLevelId,
                Name = SystemRoles.SecondLevel,
                Description = "Tier 2 SOC specialist"
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

    private static async Task EnsureAdminAsync(AlertFrogDbContext context)
    {
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

    private static async Task EnsureSupportUsersAsync(AlertFrogDbContext context)
    {
        var supportUsers = new List<(string Name, string Email, Guid RoleId)>
        {
            ("Tier 1 Analyst", FirstLevelEmail, SystemRoles.FirstLevelId),
            ("Tier 2 Specialist", SecondLevelEmail, SystemRoles.SecondLevelId),
            ("On-call Analyst", AnalystEmail, SystemRoles.UserId)
        };

        var hasChanges = false;

        foreach (var (name, email, roleId) in supportUsers)
        {
            var existing = await context.Users.SingleOrDefaultAsync(u => u.Email == email);
            if (existing is not null)
            {
                continue;
            }

            context.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Name = name,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(DefaultPassword),
                RoleId = roleId,
                CreatedAt = DateTime.UtcNow
            });
            hasChanges = true;
        }

        if (hasChanges)
        {
            await context.SaveChangesAsync();
        }
    }

    private static async Task EnsureIncidentsAsync(AlertFrogDbContext context)
    {
        if (await context.Incidents.AnyAsync())
        {
            return;
        }

        var tier1 = await context.Users.SingleOrDefaultAsync(u => u.Email == FirstLevelEmail);
        var tier2 = await context.Users.SingleOrDefaultAsync(u => u.Email == SecondLevelEmail);
        var registrant = await context.Users.SingleOrDefaultAsync(u => u.Email == AnalystEmail) ??
                         await context.Users.SingleAsync(u => u.Email == AdminEmail);

        if (tier1 is null || tier2 is null || registrant is null)
        {
            return;
        }

        var incidents = new List<Incident>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Suspicious outbound traffic",
                Description = "Detected abnormal data exfiltration pattern from finance workstation.",
                Severity = "High",
                Status = "Investigating",
                Cve = "CVE-2024-23334",
                AffectedSystem = "fin-workstation-08",
                AssignedUserId = tier1.Id,
                RegistrantUserId = registrant.Id,
                CreatedAt = DateTime.UtcNow.AddMinutes(-42)
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Critical API authentication bypass",
                Description = "API gateway detected repeated auth bypass attempts leveraging poisoned JWT.",
                Severity = "Critical",
                Status = "Open",
                Cve = "CVE-2025-1120",
                AffectedSystem = "api-gateway-02",
                AssignedUserId = tier2.Id,
                RegistrantUserId = registrant.Id,
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Privilege escalation alert",
                Description = "Privileged account created outside change window on db cluster.",
                Severity = "Medium",
                Status = "Open",
                Cve = "CVE-2023-2877",
                AffectedSystem = "db-cluster-01",
                AssignedUserId = tier1.Id,
                RegistrantUserId = registrant.Id,
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            }
        };

        await context.Incidents.AddRangeAsync(incidents);
        await context.SaveChangesAsync();
    }
}
