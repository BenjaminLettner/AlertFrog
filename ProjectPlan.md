Project Structure

The goal is to create a working SIMS (Security Incident Management System) in which you can manage security incidents. It will have a TypeScript frontend and a .net 8.0 WebAPI backend. On the MySQL Database it will use Entity Framework. For logging it will use Redis. A User should be able to login and manage Incidents manually.

Each component will run in its own docker container like microservices.

The Docker Structure should be as follows:

1. Frontend
2. Backend
3. MySQL
4. Redis


The Frontend will have the following Pages:

- Login
- Dashboard
- Incident Management
- User Managment
- Settings

The Backend will have the following Features:

- API Endpoints for the different Actions
- User Management
- MySql Database for Data Storage (e.g. User Data, SBOMs, Incidents)
- Redis for Logging

The Core functions will be:

- User Login
- add/update/remove Incidents
- Escalation of Incidents
- add/update/remove Users
- list Incidents

- Frontend
    - TypeScript
- Backend
    - .net 8.0 WebAPI
- Database
    - MySQL
    - Entity Framework
- Logging
    - Redis