using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Constants;
using Backend.Data;
using Backend.Models;
using Backend.Options;
using Backend.Requests;
using Backend.Responses;
using Backend.Services;
using BCrypt.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AlertFrogDbContext dbContext, IOptions<JwtOptions> jwtOptions, AuditLogService auditLog) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await dbContext.Users.Include(u => u.Role).SingleOrDefaultAsync(u => u.Email == request.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        var token = GenerateToken(user);

        await auditLog.LogAsync(
            action: "User Login",
            actorEmail: user.Email,
            actorRole: user.Role?.Name ?? SystemRoles.User,
            details: $"Successful login from {HttpContext.Connection.RemoteIpAddress}"
        );

        return Ok(new LoginResponse
        {
            Id = user.Id,
            Token = token,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role?.Name ?? SystemRoles.User
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var exists = await dbContext.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            return Conflict(new { message = "User already exists" });
        }

        var role = await dbContext.Roles.SingleOrDefaultAsync(r => r.Name == request.Role);
        if (role is null)
        {
            return BadRequest(new { message = $"Role '{request.Role}' is not recognized." });
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            Name = request.Name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = role.Id
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(Register), new { id = user.Id }, new { user.Id, user.Email, user.Name });
    }

    private string GenerateToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(jwtOptions.Value.Key);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role?.Name ?? SystemRoles.User)
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(jwtOptions.Value.ExpiryMinutes),
            Issuer = jwtOptions.Value.Issuer,
            Audience = jwtOptions.Value.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(descriptor);
        return tokenHandler.WriteToken(token);
    }
}
