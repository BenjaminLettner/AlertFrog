using Backend.Options;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using System.Text.Json;

namespace Backend.Services;

public class AuditLogService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly string _keyPrefix;
    private const int MaxLogEntries = 1000;

    public AuditLogService(IConnectionMultiplexer redis, IOptions<RedisOptions> options)
    {
        _redis = redis;
        _keyPrefix = options.Value.KeyPrefix;
    }

    public async Task LogAsync(string action, string actorEmail, string actorRole, string? targetEntity = null, string? details = null)
    {
        var db = _redis.GetDatabase();
        var logKey = $"{_keyPrefix}:audit_logs";

        var entry = new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTime.UtcNow,
            Action = action,
            ActorEmail = actorEmail,
            ActorRole = actorRole,
            TargetEntity = targetEntity,
            Details = details
        };

        var json = JsonSerializer.Serialize(entry);
        
        await db.ListLeftPushAsync(logKey, json);
        await db.ListTrimAsync(logKey, 0, MaxLogEntries - 1);
    }

    public async Task<List<AuditLogEntry>> GetLogsAsync(int count = 100, int skip = 0)
    {
        var db = _redis.GetDatabase();
        var logKey = $"{_keyPrefix}:audit_logs";

        var values = await db.ListRangeAsync(logKey, skip, skip + count - 1);
        
        var logs = new List<AuditLogEntry>();
        foreach (var value in values)
        {
            if (value.HasValue)
            {
                var entry = JsonSerializer.Deserialize<AuditLogEntry>(value.ToString());
                if (entry != null)
                {
                    logs.Add(entry);
                }
            }
        }

        return logs;
    }
}

public class AuditLogEntry
{
    public Guid Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string? TargetEntity { get; set; }
    public string? Details { get; set; }
}
