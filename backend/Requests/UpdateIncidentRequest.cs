namespace Backend.Requests;

public class UpdateIncidentRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Severity { get; set; }
    public string? Status { get; set; }
    public string? Cve { get; set; }
    public string? AffectedSystem { get; set; }
    public Guid? AssignedUserId { get; set; }
}
