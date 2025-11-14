# Development Dockerfile for Backend (.NET 8 WebAPI)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dev
WORKDIR /src

# Copy project files and restore dependencies first for better caching.
COPY ./Backend.csproj ./
RUN dotnet restore

# Copy the rest of the source.
COPY . .

# Expose the default API port.
EXPOSE 8080

# Run with dotnet watch for live reload during development.
CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8080"]
