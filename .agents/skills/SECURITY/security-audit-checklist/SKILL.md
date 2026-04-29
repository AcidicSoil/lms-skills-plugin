---
name: security-audit-checklist
description: Security audit checklist for infrastructure, CI/CD pipelines, and applications. Use for security assessments, compliance checks, and vulnerability identification.
---

# Security Audit Checklist

A comprehensive security audit checklist for assessing infrastructure, CI/CD pipelines, and applications for vulnerabilities and compliance gaps.

---

## When to Use This Skill

Use this skill when:
- Performing security assessments
- Preparing for compliance audits
- Reviewing infrastructure security
- Assessing CI/CD pipeline security
- Identifying vulnerabilities
- Validating security controls

---

## Executive Summary Template

```markdown
# Security Assessment Report

## Assessment Overview
**Date:** {assessment date}
**Scope:** {infrastructure, CI/CD, application}
**Assessor:** {name/role}

## Overall Risk Level
🔴 **Critical** | 🟠 **High** | 🟡 **Medium** | 🟢 **Low**

## Findings Summary
| Severity | Count | Remediated | Open |
|----------|-------|------------|------|
| Critical | {X} | {X} | {X} |
| High | {X} | {X} | {X} |
| Medium | {X} | {X} | {X} |
| Low | {X} | {X} | {X} |

## Key Findings
1. **{FINDING-001}**: {Brief description}
2. **{FINDING-002}**: {Brief description}
3. **{FINDING-003}**: {Brief description}

## Recommendations
{Top 3-5 prioritized recommendations}
```

---

## Identity & Access Management

### Authentication
- [ ] MFA enabled for all users
- [ ] Password policies enforced (length, complexity, rotation)
- [ ] Account lockout after failed attempts
- [ ] Session timeout configured
- [ ] SSO/SAML integration for enterprise
- [ ] Service accounts use managed identities (not passwords)
- [ ] No shared accounts

### Authorization
- [ ] RBAC implemented (not owner-level access)
- [ ] Least privilege principle applied
- [ ] Access reviews conducted quarterly
- [ ] Privileged access management (PAM) for admin accounts
- [ ] Just-in-time (JIT) access for sensitive resources
- [ ] Access logs enabled and monitored

### Service Principals
- [ ] Service principals have minimal permissions
- [ ] Credentials rotated regularly
- [ ] No hardcoded credentials in code
- [ ] Certificates used instead of secrets (when possible)
- [ ] Expiration dates monitored

---

## Network Security

### Network Segmentation
- [ ] VPC/VNet implemented
- [ ] Public and private subnets separated
- [ ] Database in private subnet only
- [ ] Bastion host for admin access
- [ ] No direct internet access to sensitive resources

### Security Groups / NSGs
- [ ] Inbound rules follow least privilege
- [ ] Default deny all inbound
- [ ] Only required ports open
- [ ] Source IP restrictions applied
- [ ] Egress filtering implemented

### Web Application Firewall
- [ ] WAF enabled for web applications
- [ ] OWASP Core Rule Set enabled
- [ ] Custom rules for application-specific threats
- [ ] WAF in prevention mode (not just detection)
- [ ] WAF logs sent to SIEM

### DDoS Protection
- [ ] DDoS protection enabled
- [ ] Rate limiting configured
- [ ] Auto-scaling for traffic spikes
- [ ] DDoS response plan documented

---

## Data Protection

### Encryption at Rest
- [ ] Storage accounts encrypted
- [ ] Database TDE enabled
- [ ] Disk encryption for VMs
- [ ] Backup encryption enabled
- [ ] Key management strategy defined

### Encryption in Transit
- [ ] TLS 1.2+ enforced
- [ ] HTTPS redirect configured
- [ ] Certificate management automated
- [ ] No HTTP endpoints for sensitive data
- [ ] Internal service-to-service TLS

### Secrets Management
- [ ] Key Vault / Secrets Manager used
- [ ] No secrets in code repositories
- [ ] No secrets in pipeline code
- [ ] Secret rotation automated
- [ ] Access to secrets audited

### Data Classification
- [ ] Data classification policy defined
- [ ] PII data identified and labeled
- [ ] Sensitive data handling procedures
- [ ] Data retention policy defined
- [ ] Data deletion procedures

---

## Application Security

### OWASP Top 10 Coverage

#### A01: Broken Access Control
- [ ] Authorization checks on all endpoints
- [ ] Deny by default
- [ ] Server-side validation (not client-only)
- [ ] CORS properly configured
- [ ] API rate limiting

#### A02: Cryptographic Failures
- [ ] TLS 1.2+ for all data in transit
- [ ] Strong algorithms (AES-256, RSA-2048+)
- [ ] No weak ciphers enabled
- [ ] Proper certificate validation
- [ ] Key rotation procedures

#### A03: Injection
- [ ] Parameterized queries (no SQL concatenation)
- [ ] Input validation on all inputs
- [ ] Output encoding for XSS prevention
- [ ] ORM frameworks used
- [ ] Command injection prevented

#### A04: Insecure Design
- [ ] Threat modeling conducted
- [ ] Security requirements defined
- [ ] Secure design patterns used
- [ ] Security review in design phase

#### A05: Security Misconfiguration
- [ ] Default credentials changed
- [ ] Unnecessary features disabled
- [ ] Security headers configured
- [ ] Error messages don't leak info
- [ ] Directory listing disabled

#### A06: Vulnerable Components
- [ ] Dependency scanning in CI/CD
- [ ] Regular dependency updates
- [ ] Version pinning implemented
- [ ] End-of-life components replaced
- [ ] SBOM (Software Bill of Materials) maintained

#### A07: Authentication Failures
- [ ] MFA for sensitive operations
- [ ] Strong password policies
- [ ] Account lockout implemented
- [ ] Session management secure
- [ ] Password reset secure

#### A08: Software and Data Integrity
- [ ] Code signing implemented
- [ ] Integrity checks on downloads
- [ ] CI/CD pipeline secured
- [ ] Supply chain security assessed
- [ ] Update mechanisms secure

#### A09: Security Logging
- [ ] Audit logging enabled
- [ ] Logs sent to centralized SIEM
- [ ] Log retention policy defined
- [ ] Anomaly detection configured
- [ ] Alert thresholds set

#### A10: SSRF
- [ ] URL validation implemented
- [ ] Allowlists for external calls
- [ ] Network segmentation limits SSRF impact
- [ ] Metadata endpoints protected

---

## CI/CD Security

### Pipeline Security
- [ ] Pipeline defined in code (GitOps)
- [ ] Pipeline access restricted
- [ ] Pipeline run permissions limited
- [ ] No manual pipeline bypasses
- [ ] Pipeline logs retained

### Secrets in Pipelines
- [ ] Secrets stored in vault (not code)
- [ ] Secrets masked in logs
- [ ] No secrets in environment variables
- [ ] Service accounts used (not personal accounts)
- [ ] Secrets rotation automated

### Artifact Security
- [ ] Artifacts signed
- [ ] Artifact repositories private
- [ ] Artifact scanning enabled
- [ ] Artifact retention policy
- [ ] Supply chain verification

### Deployment Security
- [ ] Approval gates for production
- [ ] Deployment branches protected
- [ ] Rollback procedures tested
- [ ] Deployment logs retained
- [ ] Blue-green or canary deployments

### Security Scanning in Pipeline
- [ ] SAST (Static Application Security Testing)
- [ ] DAST (Dynamic Application Security Testing)
- [ ] SCA (Software Composition Analysis)
- [ ] Container scanning
- [ ] Infrastructure scanning (IaC)

---

## Infrastructure Security

### Compute Security
- [ ] OS hardening applied
- [ ] Regular patching automated
- [ ] Antivirus/EDR installed
- [ ] Unnecessary services disabled
- [ ] File integrity monitoring

### Container Security
- [ ] Base images from trusted sources
- [ ] Images scanned for vulnerabilities
- [ ] Minimal base images (Alpine, distroless)
- [ ] Containers run as non-root
- [ ] Resource limits configured
- [ ] Network policies applied

### Kubernetes Security
- [ ] RBAC enabled and configured
- [ ] Pod Security Policies/Standards
- [ ] Network policies defined
- [ ] Secrets encrypted at rest
- [ ] API server access restricted
- [ ] Audit logging enabled

### Serverless Security
- [ ] Function permissions minimal
- [ ] Function timeout configured
- [ ] Environment variables encrypted
- [ ] Dependency scanning enabled
- [ ] Function logging enabled

---

## Monitoring & Incident Response

### Security Monitoring
- [ ] Security Center / GuardDuty enabled
- [ ] Threat detection configured
- [ ] Anomaly detection enabled
- [ ] Security alerts configured
- [ ] Alerts routed to on-call

### Log Management
- [ ] Centralized logging (SIEM)
- [ ] Log retention meets compliance
- [ ] Log integrity protected
- [ ] Log access restricted
- [ ] Log analysis automated

### Incident Response
- [ ] Incident response plan documented
- [ ] Incident response team defined
- [ ] Communication plan defined
- [ ] Forensic procedures defined
- [ ] Post-incident review process

### Backup & Recovery
- [ ] Backup strategy defined
- [ ] Backups encrypted
- [ ] Backup testing performed
- [ ] Recovery procedures documented
- [ ] RTO/RPO defined and met

---

## Compliance

### SOC 2 Type II
- [ ] Security policies documented
- [ ] Access controls implemented
- [ ] Change management procedures
- [ ] Risk assessments conducted
- [ ] Vendor management procedures

### ISO 27001
- [ ] ISMS (Information Security Management System) established
- [ ] Risk treatment plan defined
- [ ] Statement of Applicability
- [ ] Internal audits conducted
- [ ] Management review conducted

### HIPAA (if applicable)
- [ ] PHI identified and protected
- [ ] Access controls for PHI
- [ ] Audit controls for PHI access
- [ ] Transmission security for PHI
- [ ] BAAs signed with vendors

### PCI-DSS (if applicable)
- [ ] Cardholder data protected
- [ ] Encryption for cardholder data
- [ ] Access control for cardholder data
- [ ] Network monitoring
- [ ] Vulnerability management

### GDPR / LGPD
- [ ] Data inventory maintained
- [ ] Consent management
- [ ] Data subject rights procedures
- [ ] Data breach notification procedures
- [ ] Data protection impact assessments

---

## Finding Documentation Template

```markdown
## {FINDING-XXX}: {Finding Title}

### Overview
**Severity:** Critical / High / Medium / Low
**Category:** {IAM, Network, Data, Application, etc.}
**Affected Resources:** {list of affected resources}

### Description
{Detailed description of the finding}

### Risk
{What risk does this create? What could happen?}

### Evidence
{How was this finding identified? Include screenshots, logs, etc.}

### Recommendation
{Specific, actionable remediation steps}

### Effort
**Implementation Effort:** Low / Medium / High
**Timeline:** {recommended timeline for remediation}

### References
- {Relevant standards, guidelines, documentation}
```

---

## Risk Scoring

### Risk Score Calculation
```
Risk Score = Likelihood × Impact

Likelihood Scale (1-5):
1 - Rare (<1% chance per year)
2 - Unlikely (1-10% chance per year)
3 - Possible (10-50% chance per year)
4 - Likely (50-90% chance per year)
5 - Almost Certain (>90% chance per year)

Impact Scale (1-5):
1 - Insignificant (minimal impact)
2 - Minor (limited impact)
3 - Moderate (significant impact)
4 - Major (severe impact)
5 - Catastrophic (existential threat)
```

### Risk Priority Matrix
| Likelihood \ Impact | 1 (Low) | 2 | 3 | 4 | 5 (High) |
|---------------------|---------|---|---|---|----------|
| **5** (Certain) | Medium | High | Critical | Critical | Critical |
| **4** (Likely) | Medium | Medium | High | Critical | Critical |
| **3** (Possible) | Low | Medium | High | High | Critical |
| **2** (Unlikely) | Low | Low | Medium | High | High |
| **1** (Rare) | Low | Low | Low | Medium | High |

---

## Related Skills

- **infrastructure-as-code-patterns** — Secure IaC patterns
- **ci-cd-patterns** — Secure pipeline patterns
- **cloud-cost-optimization** — Security vs cost trade-offs

---

## Output Format

When using this skill, provide:
1. **Executive summary** with overall risk level
2. **Findings summary** by severity
3. **Detailed findings** with evidence and recommendations
4. **Risk scores** for each finding
5. **Prioritized remediation plan**
6. **Compliance gaps** identified
7. **Security controls** assessment
