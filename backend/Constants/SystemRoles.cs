using System;

namespace Backend.Constants;

public static class SystemRoles
{
    public const string Admin = "Admin";
    public const string User = "User";

    public static readonly Guid AdminId = Guid.Parse("8A8EF3AC-2C98-489A-A7D0-53C51DBF7ADB");
    public static readonly Guid UserId = Guid.Parse("C6AB4494-9FD4-4E58-8BB5-A9311FC22B1F");
}
