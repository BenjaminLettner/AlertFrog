using System;

namespace Backend.Constants;

public static class SystemRoles
{
    public const string Admin = "Admin";
    public const string User = "User";
    public const string FirstLevel = "1st Level";
    public const string SecondLevel = "2nd Level";

    public static readonly Guid AdminId = Guid.Parse("8A8EF3AC-2C98-489A-A7D0-53C51DBF7ADB");
    public static readonly Guid UserId = Guid.Parse("C6AB4494-9FD4-4E58-8BB5-A9311FC22B1F");
    public static readonly Guid FirstLevelId = Guid.Parse("A3C9DA23-A6C4-4FD6-B2F4-2F9D4F923F2A");
    public static readonly Guid SecondLevelId = Guid.Parse("E4B7A6E3-7583-4B57-9F20-7F6A1A1EF627");
}
