using Backend.Constants;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = SystemRoles.Admin)]
public class LogsController(AuditLogService auditLog) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLogEntry>>> GetLogs([FromQuery] int count = 100, [FromQuery] int skip = 0)
    {
        var logs = await auditLog.GetLogsAsync(count, skip);
        return Ok(logs);
    }
}
