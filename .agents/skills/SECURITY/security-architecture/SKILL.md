---
name: security-architecture
description: Security architecture patterns and threat modeling. Use when designing security controls, threat models, security boundaries, authentication/authorization patterns, data protection strategies, or compliance requirements (OWASP, ISO 27001, SOC 2, LGPD/GDPR).
license: Apache 2.0
---

# Security Architecture Patterns

Comprehensive security architecture patterns and threat modeling guidance for designing secure systems.

## When to Use This Skill

Use this skill when:
- Designing security architecture for new systems
- Conducting threat modeling sessions (STRIDE, DREAD, PASTA)
- Defining security boundaries and trust zones
- Implementing authentication/authorization patterns
- Planning data protection strategies (encryption, tokenization)
- Meeting compliance requirements (OWASP, ISO 27001, SOC 2, LGPD/GDPR, PCI-DSS, HIPAA)
- Reviewing security controls and identifying gaps
- Designing zero trust architectures

## Core Security Patterns

### 1. Zero Trust Architecture
**Principles:**
- Never trust, always verify
- Least privilege access
- Micro-segmentation
- Assume breach mentality

**Implementation:**
- Identity-based perimeter
- Device trust verification
- Network segmentation
- Continuous monitoring

### 2. Defense in Depth
**Layers:**
- Physical security
- Network security (firewalls, IDS/IPS)
- Application security (WAF, input validation)
- Data security (encryption, tokenization)
- Access control (authentication, authorization)
- Monitoring and response

### 3. Security by Design
**Practices:**
- Threat modeling in design phase
- Security requirements definition
- Secure coding standards
- Security testing (SAST, DAST, penetration testing)
- Security code review

## Threat Modeling Framework

### STRIDE Method
| Threat | Description | Example | Mitigation |
|--------|-------------|---------|------------|
| **Spoofing** | Impersonating another entity | Fake login page | Strong authentication |
| **Tampering** | Modifying data or code | SQL injection | Input validation, integrity checks |
| **Repudiation** | Denying an action occurred | "I didn't make that transaction" | Audit logs, digital signatures |
| **Information Disclosure** | Exposing sensitive data | Data breach | Encryption, access controls |
| **Denial of Service** | Making system unavailable | DDoS attack | Rate limiting, redundancy |
| **Elevation of Privilege** | Gaining unauthorized access | Privilege escalation | Least privilege, RBAC |

### DREAD Risk Assessment
| Factor | Questions | Scale (1-10) |
|--------|-----------|--------------|
| **Damage** | How bad is the impact? | 1 (minor) to 10 (catastrophic) |
| **Reproducibility** | How easy to reproduce? | 1 (hard) to 10 (trivial) |
| **Exploitability** | How easy to exploit? | 1 (hard) to 10 (trivial) |
| **Affected Users** | How many users affected? | 1 (few) to 10 (all) |
| **Discoverability** | How easy to discover? | 1 (hard) to 10 (obvious) |

**Risk Score:** (D + R + E + A + D) / 5

### PASTA Process (7 Stages)
1. **Define Objectives**: Business and security goals
2. **Define Scope**: Assets, processes, systems
3. **Application Decomposition**: Components, data flows
4. **Threat Analysis**: STRIDE analysis
5. **Vulnerability Analysis**: Weaknesses identification
6. **Risk Analysis**: Likelihood and impact
7. **Countermeasures**: Mitigation strategies

## Authentication Patterns

### OAuth 2.0 / OpenID Connect
**Flows:**
- Authorization Code Flow (web apps)
- Client Credentials Flow (machine-to-machine)
- Device Flow (IoT, CLI apps)
- PKCE (mobile apps, SPAs)

**Best Practices:**
- Use short-lived access tokens
- Implement token refresh rotation
- Validate all tokens
- Use secure token storage

### Multi-Factor Authentication (MFA)
**Factors:**
- Knowledge (password, PIN)
- Possession (phone, token)
- Inherence (biometrics)

**Implementation:**
- TOTP (Time-based One-Time Password)
- Push notifications
- Hardware tokens (FIDO2, WebAuthn)
- SMS (less secure, use as fallback)

### Single Sign-On (SSO)
**Protocols:**
- SAML 2.0 (enterprise)
- OpenID Connect (modern apps)
- Kerberos (on-premise)

## Authorization Patterns

### Role-Based Access Control (RBAC)
```
User → Role → Permission → Resource
```
**Best for:** Organizations with clear role hierarchies

### Attribute-Based Access Control (ABAC)
```
Access = Subject Attributes + Resource Attributes + Environment + Action
```
**Best for:** Fine-grained, dynamic access control

### Policy-Based Access Control (PBAC)
**Components:**
- Policy Decision Point (PDP)
- Policy Enforcement Point (PEP)
- Policy Administration Point (PAP)

## Data Protection Patterns

### Encryption
**At Rest:**
- Database encryption (TDE)
- File system encryption
- Object storage encryption

**In Transit:**
- TLS 1.3 for all communications
- Mutual TLS for service-to-service
- Certificate pinning for mobile

**Key Management:**
- HSM (Hardware Security Module)
- Cloud KMS (AWS KMS, Azure Key Vault)
- Key rotation policies
- Key hierarchy (master key → data keys)

### Tokenization
**Use Cases:**
- Payment card data (PCI-DSS)
- PII protection
- Sensitive identifiers

**Implementation:**
- Vault-based tokenization
- Format-preserving tokenization
- Detokenization controls

## Security Controls Matrix

### OWASP Top 10 Mitigations
| Risk | Controls |
|------|----------|
| **A01: Broken Access Control** | RBAC, deny by default, audit logging |
| **A02: Cryptographic Failures** | TLS 1.3, strong algorithms, key management |
| **A03: Injection** | Parameterized queries, input validation, ORM |
| **A04: Insecure Design** | Threat modeling, secure design patterns |
| **A05: Security Misconfiguration** | Hardening guides, automated scanning |
| **A06: Vulnerable Components** | SCA tools, dependency updates |
| **A07: Authentication Failures** | MFA, password policies, account lockout |
| **A08: Software and Data Integrity** | Code signing, CI/CD security, SRI |
| **A09: Security Logging** | Centralized logging, alerting, audit trails |
| **A10: SSRF** | Allowlists, network segmentation |

### Compliance Mapping
| Standard | Key Requirements | Controls |
|----------|-----------------|----------|
| **ISO 27001** | ISMS, risk assessment | Policies, procedures, audits |
| **SOC 2** | Security, availability, confidentiality | Access controls, encryption, monitoring |
| **LGPD/GDPR** | Data privacy, consent | Data mapping, DPO, breach notification |
| **PCI-DSS** | Payment card security | Network segmentation, encryption, logging |
| **HIPAA** | Healthcare data | PHI protection, access controls, audit |

## Security Architecture Documentation

### Required Documents
1. **Security Architecture Diagram**
   - Trust boundaries
   - Security controls
   - Data flows with encryption

2. **Threat Model Report**
   - Assets and threats
   - Risk ratings (DREAD)
   - Mitigation strategies

3. **Security Controls Matrix**
   - Control descriptions
   - Implementation status
   - Compliance mapping

4. **Incident Response Plan**
   - Detection and alerting
   - Response procedures
   - Recovery steps

### Security Review Checklist
- [ ] Threat modeling completed
- [ ] Security requirements defined
- [ ] Authentication/authorization designed
- [ ] Data protection implemented
- [ ] Logging and monitoring in place
- [ ] Incident response plan documented
- [ ] Security testing planned (penetration test, SAST, DAST)

## Output Format

When using this skill, create:

1. **Security Architecture Document** (`/docs/security/{system}_Security.md`)
   - Security context diagram
   - Threat model
   - Security controls
   - Compliance mapping

2. **Threat Model** (`/docs/security/{system}_ThreatModel.md`)
   - Assets inventory
   - STRIDE analysis
   - DREAD risk scores
   - Mitigation plan

3. **Security Controls Matrix** (`/docs/security/{system}_Controls.md`)
   - Control catalog
   - Implementation status
   - Evidence links

## Best Practices

1. **Shift Left**: Integrate security early in design
2. **Defense in Depth**: Multiple layers of security
3. **Least Privilege**: Minimum access required
4. **Assume Breach**: Design for containment
5. **Zero Trust**: Verify explicitly, always
6. **Secure Defaults**: Default to secure configuration
7. **Fail Securely**: Graceful degradation
8. **Complete Mediation**: Check every access
9. **Audit Everything**: Comprehensive logging
10. **Regular Reviews**: Continuous security assessment

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [Microsoft Threat Modeling Tool](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [ISO 27001](https://www.iso.org/standard/27001)
- [Zero Trust Architecture](https://www.nist.gov/publications/zero-trust-architecture)

### MCP Interactions
- **GitHub MCP**: Search repository for previous similar actions or related PRs before executing this skill.
- **Brave Search MCP**: Validate current patterns against the live internet if the context is sparse.
- **Context7 MCP**: Extract deep architectural/domain context relevant to the skill's execution.
