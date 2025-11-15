namespace Backend.Requests;

public class CreateIncidentRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
    public string? Cve { get; set; }
    public string? AffectedSystem { get; set; }
    public Guid AssignedUserId { get; set; }
    public Guid? RegistrantUserId { get; set; }
}
