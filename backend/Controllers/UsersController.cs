using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Backend.Constants;
using Backend.Data;
using Backend.Requests;
using Backend.Responses;
using Backend.Services;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(AlertFrogDbContext dbContext, AuditLogService auditLog) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<ProfileResponse>> GetProfile()
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        return new ProfileResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty
        };
    }

    [HttpGet]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<IEnumerable<UserSummaryResponse>>> GetUsers()
    {
        var users = await dbContext.Users.Include(u => u.Role).OrderBy(u => u.Name).ToListAsync();
        var result = users.Select(u => new UserSummaryResponse
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Role = u.Role?.Name ?? string.Empty,
            CreatedAt = u.CreatedAt
        });

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<UserSummaryResponse>> CreateUser(CreateUserRequest request)
    {
        var role = await dbContext.Roles.SingleOrDefaultAsync(r => r.Name == request.Role);
        if (role is null)
        {
            return BadRequest(new { message = $"Role '{request.Role}' is not recognized." });
        }

        var exists = await dbContext.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            return Conflict(new { message = "Email already in use." });
        }

        var user = new Backend.Models.User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = role.Id
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var actor = await GetCurrentUserAsync();
        await auditLog.LogAsync(
            action: "User Created",
            actorEmail: actor?.Email ?? "system",
            actorRole: actor?.Role?.Name ?? "Admin",
            targetEntity: $"User: {user.Email}",
            details: $"Created user with role {role.Name}"
        );

        return CreatedAtAction(nameof(GetUsers), new { id = user.Id }, new UserSummaryResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = role.Name,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<UserSummaryResponse>> UpdateUser(Guid id, UpdateUserRequest request)
    {
        var user = await dbContext.Users.Include(u => u.Role).SingleOrDefaultAsync(u => u.Id == id);
        if (user is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !request.Email.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await dbContext.Users.AnyAsync(u => u.Email == request.Email && u.Id != id);
            if (exists)
            {
                return Conflict(new { message = "Email already in use." });
            }
            user.Email = request.Email;
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            user.Name = request.Name;
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var role = await dbContext.Roles.SingleOrDefaultAsync(r => r.Name == request.Role);
            if (role is null)
            {
                return BadRequest(new { message = $"Role '{request.Role}' is not recognized." });
            }
            user.RoleId = role.Id;
            user.Role = role;
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await dbContext.SaveChangesAsync();

        var actor = await GetCurrentUserAsync();
        await auditLog.LogAsync(
            action: "User Updated",
            actorEmail: actor?.Email ?? "system",
            actorRole: actor?.Role?.Name ?? "Admin",
            targetEntity: $"User: {user.Email}",
            details: $"Updated user details"
        );

        return new UserSummaryResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty,
            CreatedAt = user.CreatedAt
        };
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(u => u.Id == id);
        if (user is null)
        {
            return NotFound();
        }

        var actor = await GetCurrentUserAsync();
        var targetEmail = user.Email;
        
        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync();

        await auditLog.LogAsync(
            action: "User Deleted",
            actorEmail: actor?.Email ?? "system",
            actorRole: actor?.Role?.Name ?? "Admin",
            targetEntity: $"User: {targetEmail}",
            details: "User removed from system"
        );

        return NoContent();
    }

    [HttpPut("me")]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !request.Email.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await dbContext.Users.AnyAsync(u => u.Email == request.Email);
            if (exists)
            {
                return Conflict(new { message = "Another user already uses that email." });
            }

            user.Email = request.Email;
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            user.Name = request.Name;
        }

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        await dbContext.SaveChangesAsync();

        return new ProfileResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role?.Name ?? string.Empty
        };
    }

    private async Task<Backend.Models.User?> GetCurrentUserAsync()
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (idValue is null || !Guid.TryParse(idValue, out var userId))
        {
            return null;
        }

        return await dbContext.Users.Include(u => u.Role).SingleOrDefaultAsync(u => u.Id == userId);
    }
}
