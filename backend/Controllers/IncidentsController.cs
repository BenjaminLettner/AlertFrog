using System.Security.Claims;
using Backend.Constants;
using Backend.Data;
using Backend.Models;
using Backend.Requests;
using Backend.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IncidentsController(AlertFrogDbContext dbContext) : ControllerBase
{
    private const string ManageIncidentRoles = SystemRoles.Admin + "," + SystemRoles.FirstLevel + "," + SystemRoles.SecondLevel;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<IncidentResponse>>> GetIncidents()
    {
        var incidents = await dbContext.Incidents
            .Include(i => i.AssignedUser)!.ThenInclude(u => u.Role)
            .Include(i => i.RegistrantUser)!.ThenInclude(u => u.Role)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var responses = incidents.Select(MapIncident).ToList();
        return Ok(responses);
    }

    [HttpPost]
    [Authorize(Roles = ManageIncidentRoles)]
    public async Task<ActionResult<IncidentResponse>> CreateIncident(CreateIncidentRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var registrant = request.RegistrantUserId.HasValue
            ? await dbContext.Users.Include(u => u.Role).SingleOrDefaultAsync(u => u.Id == request.RegistrantUserId.Value)
            : currentUser;

        if (registrant is null)
        {
            return BadRequest(new { message = "Registrant user could not be found." });
        }

        var assignedUserId = request.AssignedUserId == Guid.Empty ? registrant.Id : request.AssignedUserId;
        var assignedUser = await dbContext.Users.Include(u => u.Role).SingleOrDefaultAsync(u => u.Id == assignedUserId);
        if (assignedUser is null)
        {
            return BadRequest(new { message = "Assigned user could not be found." });
        }

        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Severity = request.Severity,
            Status = request.Status,
            Cve = request.Cve,
            AffectedSystem = request.AffectedSystem,
            AssignedUserId = assignedUser.Id,
            AssignedUser = assignedUser,
            RegistrantUserId = registrant.Id,
            RegistrantUser = registrant,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ResolvedAt = IsResolvedStatus(request.Status) ? DateTime.UtcNow : null
        };

        dbContext.Incidents.Add(incident);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetIncidents), null, MapIncident(incident));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = ManageIncidentRoles)]
    public async Task<ActionResult<IncidentResponse>> UpdateIncident(Guid id, UpdateIncidentRequest request)
    {
        var incident = await dbContext.Incidents
            .Include(i => i.AssignedUser)!.ThenInclude(u => u.Role)
            .Include(i => i.RegistrantUser)!.ThenInclude(u => u.Role)
            .SingleOrDefaultAsync(i => i.Id == id);

        if (incident is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            incident.Title = request.Title;
        }

        if (!string.IsNullOrWhiteSpace(request.Description))
        {
            incident.Description = request.Description;
        }

        if (!string.IsNullOrWhiteSpace(request.Severity))
        {
            incident.Severity = request.Severity;
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            incident.Status = request.Status;
            incident.ResolvedAt = IsResolvedStatus(request.Status) ? incident.ResolvedAt ?? DateTime.UtcNow : null;
        }

        if (request.AssignedUserId.HasValue && request.AssignedUserId.Value != Guid.Empty)
        {
            var assignedUser = await dbContext.Users.Include(u => u.Role)
                .SingleOrDefaultAsync(u => u.Id == request.AssignedUserId.Value);
            if (assignedUser is null)
            {
                return BadRequest(new { message = "Assigned user could not be found." });
            }

            incident.AssignedUserId = assignedUser.Id;
            incident.AssignedUser = assignedUser;
        }

        if (request.Cve is not null)
        {
            incident.Cve = request.Cve;
        }

        if (request.AffectedSystem is not null)
        {
            incident.AffectedSystem = request.AffectedSystem;
        }

        incident.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return MapIncident(incident);
    }

    [HttpPost("{id:guid}/resolve")]
    [Authorize(Roles = ManageIncidentRoles)]
    public async Task<ActionResult<IncidentResponse>> ResolveIncident(Guid id)
    {
        var incident = await dbContext.Incidents
            .Include(i => i.AssignedUser)!.ThenInclude(u => u.Role)
            .Include(i => i.RegistrantUser)!.ThenInclude(u => u.Role)
            .SingleOrDefaultAsync(i => i.Id == id);

        if (incident is null)
        {
            return NotFound();
        }

        incident.Status = "Resolved";
        incident.ResolvedAt = DateTime.UtcNow;
        incident.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return MapIncident(incident);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> DeleteIncident(Guid id)
    {
        var incident = await dbContext.Incidents.SingleOrDefaultAsync(i => i.Id == id);
        if (incident is null)
        {
            return NotFound();
        }

        dbContext.Incidents.Remove(incident);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:guid}/escalate")]
    public async Task<ActionResult<IncidentResponse>> Escalate(Guid id)
    {
        var incident = await dbContext.Incidents
            .Include(i => i.AssignedUser)!.ThenInclude(u => u.Role)
            .Include(i => i.RegistrantUser)!.ThenInclude(u => u.Role)
            .SingleOrDefaultAsync(i => i.Id == id);

        if (incident is null)
        {
            return NotFound();
        }

        if (IsResolvedStatus(incident.Status))
        {
            return BadRequest(new { message = "Resolved incidents cannot be escalated." });
        }

        var nextAssignee = await GetNextEscalationTargetAsync(incident);
        if (nextAssignee is null)
        {
            return BadRequest(new { message = "Incident cannot be escalated further." });
        }

        incident.AssignedUserId = nextAssignee.Id;
        incident.AssignedUser = nextAssignee;
        incident.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return MapIncident(incident);
    }

    private async Task<User?> GetNextEscalationTargetAsync(Incident incident)
    {
        var currentRole = incident.AssignedUser?.Role?.Name;

        if (currentRole == SystemRoles.FirstLevel)
        {
            return await dbContext.Users.Include(u => u.Role)
                .Where(u => u.Role != null && u.Role.Name == SystemRoles.SecondLevel)
                .OrderBy(u => u.CreatedAt)
                .FirstOrDefaultAsync();
        }

        if (currentRole == SystemRoles.SecondLevel)
        {
            return await dbContext.Users.Include(u => u.Role)
                .Where(u => u.Role != null && u.Role.Name == SystemRoles.Admin)
                .OrderBy(u => u.CreatedAt)
                .FirstOrDefaultAsync();
        }

        return null;
    }

    private static IncidentResponse MapIncident(Incident incident)
    {
        var assignedRole = incident.AssignedUser?.Role?.Name ?? string.Empty;

        return new IncidentResponse
        {
            Id = incident.Id,
            Title = incident.Title,
            Description = incident.Description,
            Severity = incident.Severity,
            Status = incident.Status,
            Cve = incident.Cve,
            AffectedSystem = incident.AffectedSystem,
            AssignedUserId = incident.AssignedUserId,
            AssignedUserName = incident.AssignedUser?.Name ?? "Unassigned",
            AssignedUserRole = assignedRole,
            RegistrantUserId = incident.RegistrantUserId,
            RegistrantName = incident.RegistrantUser?.Name ?? string.Empty,
            CreatedAt = incident.CreatedAt,
            UpdatedAt = incident.UpdatedAt,
            ResolvedAt = incident.ResolvedAt,
            CanEscalate = !IsResolvedStatus(incident.Status) && CanEscalate(assignedRole)
        };
    }

    private static bool CanEscalate(string assignedRole)
    {
        return assignedRole == SystemRoles.FirstLevel || assignedRole == SystemRoles.SecondLevel;
    }

    private static bool IsResolvedStatus(string status) => string.Equals(status, "Resolved", StringComparison.OrdinalIgnoreCase);

    private async Task<User?> GetCurrentUserAsync()
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (idValue is null || !Guid.TryParse(idValue, out var userId))
        {
            return null;
        }

        return await dbContext.Users.Include(u => u.Role).SingleOrDefaultAsync(u => u.Id == userId);
    }
}
