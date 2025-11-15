namespace Backend.Models;

public class Incident
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Cve { get; set; }
    public string? AffectedSystem { get; set; }
    public Guid AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }
    public Guid RegistrantUserId { get; set; }
    public User? RegistrantUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
