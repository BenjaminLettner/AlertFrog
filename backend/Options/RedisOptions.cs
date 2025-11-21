namespace Backend.Options;

public class RedisOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public string KeyPrefix { get; set; } = "alertfrog";
}
