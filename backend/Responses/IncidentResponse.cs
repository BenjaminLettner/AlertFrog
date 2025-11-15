namespace Backend.Responses;

public class IncidentResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Cve { get; set; }
    public string? AffectedSystem { get; set; }
    public Guid AssignedUserId { get; set; }
    public string AssignedUserName { get; set; } = string.Empty;
    public string AssignedUserRole { get; set; } = string.Empty;
    public Guid RegistrantUserId { get; set; }
    public string RegistrantName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool CanEscalate { get; set; }
}
