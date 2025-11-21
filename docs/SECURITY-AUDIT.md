# Security Audit Report - AlertFrog SIMS

**Date:** November 21, 2025  
**Tool:** Semgrep v1.144.0  
**Scan Type:** Static Application Security Testing (SAST)  
**Severity Levels:** ERROR (Blocking)

---

## Executive Summary

A comprehensive SAST scan was performed on the AlertFrog SIMS codebase using Semgrep with 1,062 security rules across multiple languages (C#, TypeScript, JavaScript, YAML, Dockerfile). The scan analyzed 78 files and identified **7 security findings**, all classified as blocking errors.

### Scan Statistics
- **Total Files Scanned:** 78
- **Rules Applied:** 298 (from 1,062 available)
- **Findings:** 7 (7 blocking)
- **Code Coverage:** ~99.9% parsed successfully
- **Languages Analyzed:** C#, TypeScript, JavaScript, JSON, YAML, Dockerfile, HTML

---

## Findings Summary

| Severity | Count | Category |
|----------|-------|----------|
| ERROR    | 7     | Security Misconfiguration |

All findings are related to **Docker security hardening** and container privilege management.

---

## Detailed Findings

### 1. Missing USER Directive in Backend Dockerfile
**Severity:** ERROR  
**File:** `backend/Dockerfile:16`  
**Rule:** `dockerfile.security.missing-user.missing-user`  
**CWE:** CWE-250 (Execution with Unnecessary Privileges)  
**OWASP:** A04:2021 - Insecure Design

#### Description
The backend Dockerfile does not specify a non-root USER. Processes run as root by default, which is a security hazard. If an attacker compromises a process, they gain root-level control over the container.

#### Current Code
```dockerfile
CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8080"]
```

#### Recommendation
Add a non-root user before the CMD instruction:
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8080"]
```

#### Risk Level
- **Likelihood:** LOW
- **Impact:** MEDIUM
- **Confidence:** MEDIUM

---

### 2. MySQL Service - Privilege Escalation Risk
**Severity:** ERROR  
**File:** `infra/docker-compose.yml:6`  
**Rule:** `yaml.docker-compose.security.no-new-privileges.no-new-privileges`  
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)  
**OWASP:** A05:2021 - Security Misconfiguration

#### Description
The MySQL service allows privilege escalation via setuid/setgid binaries, which could be exploited by malicious code running inside the container.

#### Recommendation
Add security options to prevent privilege escalation:
```yaml
mysql:
  image: mysql:8.0
  security_opt:
    - no-new-privileges:true
```

---

### 3. MySQL Service - Writable Root Filesystem
**Severity:** ERROR  
**File:** `infra/docker-compose.yml:6`  
**Rule:** `yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service`  
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)  
**OWASP:** A05:2021 - Security Misconfiguration

#### Description
MySQL service runs with a writable root filesystem, allowing malicious applications to download and execute additional payloads or modify container files.

#### Recommendation
Make the root filesystem read-only (not recommended for MySQL due to data persistence requirements). Instead, ensure proper volume permissions and monitoring.

**Note:** For database services, a writable filesystem is typically required. This finding can be accepted as a known risk with proper monitoring and access controls in place.

---

### 4. Redis Service - Privilege Escalation Risk
**Severity:** ERROR  
**File:** `infra/docker-compose.yml:27`  
**Rule:** `yaml.docker-compose.security.no-new-privileges.no-new-privileges`  
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)  
**OWASP:** A05:2021 - Security Misconfiguration

#### Description
The Redis service allows privilege escalation via setuid/setgid binaries.

#### Recommendation
```yaml
redis:
  image: redis:7-alpine
  security_opt:
    - no-new-privileges:true
```

---

### 5. Redis Service - Writable Root Filesystem
**Severity:** ERROR  
**File:** `infra/docker-compose.yml:27`  
**Rule:** `yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service`  
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)  
**OWASP:** A05:2021 - Security Misconfiguration

#### Description
Redis service runs with a writable root filesystem.

#### Recommendation
Similar to MySQL, Redis requires write access for persistence. Accept as known risk with proper monitoring.

---

### 6. Frontend Service - Privilege Escalation Risk
**Severity:** ERROR  
**File:** `infra/docker-compose.yml:72`  
**Rule:** `yaml.docker-compose.security.no-new-privileges.no-new-privileges`  
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)  
**OWASP:** A05:2021 - Security Misconfiguration

#### Description
The frontend service allows privilege escalation via setuid/setgid binaries.

#### Recommendation
```yaml
frontend:
  build:
    context: ../frontend
    dockerfile: Dockerfile
  security_opt:
    - no-new-privileges:true
```

---

### 7. Frontend Service - Writable Root Filesystem
**Severity:** ERROR  
**File:** `infra/docker-compose.yml:72`  
**Rule:** `yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service`  
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)  
**OWASP:** A05:2021 - Security Misconfiguration

#### Description
Frontend service runs with a writable root filesystem.

#### Recommendation
For development, this is acceptable. For production, consider:
```yaml
frontend:
  read_only: true
  tmpfs:
    - /tmp
    - /var/cache/nginx
```

---

## Remediation Priority

### High Priority (Immediate Action)
1. **Add non-root USER to backend Dockerfile** - Prevents root execution
2. **Add `no-new-privileges:true` to all services** - Prevents privilege escalation

### Medium Priority (Next Sprint)
3. **Implement read-only filesystems for frontend** - Hardens production deployment
4. **Review and harden MySQL/Redis configurations** - Add monitoring and access controls

### Low Priority (Future Consideration)
5. **Implement container scanning in CI/CD** - Automate security checks
6. **Add runtime security monitoring** - Detect anomalous behavior

---

## Positive Security Findings

The following security best practices were observed:

✅ **JWT Authentication** - Properly implemented with role-based access control  
✅ **Password Hashing** - BCrypt used for password storage  
✅ **Input Validation** - Request DTOs with validation attributes  
✅ **SQL Injection Protection** - EF Core parameterized queries  
✅ **CORS Configuration** - Properly configured for development  
✅ **Audit Logging** - Comprehensive logging to Redis  
✅ **Environment Variables** - Secrets not hardcoded in source  

---

## Recommendations

### Immediate Actions
1. Update `backend/Dockerfile` to run as non-root user
2. Add `security_opt: [no-new-privileges:true]` to all services in `docker-compose.yml`
3. Document security configurations in deployment guide

### Short-term Improvements
1. Implement automated SAST scanning in CI/CD pipeline
2. Add Dependabot or Renovate for dependency updates
3. Create production-ready docker-compose with hardened settings
4. Implement container image scanning (Trivy, Grype)

### Long-term Enhancements
1. Implement runtime security monitoring (Falco, Sysdig)
2. Add Web Application Firewall (WAF) for production
3. Implement secrets management (HashiCorp Vault, AWS Secrets Manager)
4. Regular penetration testing and security audits
5. Implement HTTPS/TLS for all communications
6. Add rate limiting and DDoS protection

---

## Compliance Considerations

### OWASP Top 10 2021 Coverage
- ✅ A01:2021 - Broken Access Control (JWT + RBAC implemented)
- ✅ A02:2021 - Cryptographic Failures (BCrypt for passwords)
- ✅ A03:2021 - Injection (EF Core parameterized queries)
- ⚠️ A04:2021 - Insecure Design (Container security needs hardening)
- ⚠️ A05:2021 - Security Misconfiguration (Docker hardening needed)
- ✅ A07:2021 - Identification and Authentication Failures (JWT implemented)
- ✅ A09:2021 - Security Logging and Monitoring (Audit logs implemented)

### CWE Coverage
- CWE-250: Execution with Unnecessary Privileges (1 finding)
- CWE-732: Incorrect Permission Assignment (6 findings)

---

## Running SAST Scans

To reproduce this audit:

```bash
# Install Semgrep
brew install semgrep

# Run full scan
semgrep scan --config=auto .

# Generate JSON report
semgrep scan --config=auto --json --output=sast-results.json .

# Generate SARIF report (for GitHub integration)
semgrep scan --config=auto --sarif --output=sast-results.sarif .
```

---

## Conclusion

The AlertFrog SIMS codebase demonstrates **strong application-level security practices** with proper authentication, authorization, input validation, and audit logging. All identified findings are **infrastructure-related** and can be resolved through Docker configuration hardening.

**Overall Security Posture:** GOOD  
**Risk Level:** LOW-MEDIUM (Development), MEDIUM (Production without fixes)  
**Recommended Action:** Implement high-priority fixes before production deployment.

---

## Appendix: Scan Configuration

- **Semgrep Version:** 1.144.0
- **Rules Source:** Semgrep Community Rules (1,062 rules)
- **Scan Date:** November 21, 2025
- **Scan Duration:** ~30 seconds
- **Files Excluded:** node_modules, build artifacts, .git
- **False Positives:** None identified

---

**Next Audit Date:** Quarterly or after major releases
