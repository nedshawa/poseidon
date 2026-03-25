# Threat Modeling Workflow (STRIDE)

Architecture-level threat analysis using the STRIDE framework. Identifies
threats before they become vulnerabilities by analyzing system design.

## Prerequisites

- System architecture description or diagram
- Data flow information (what data moves where)
- Trust boundaries (where privilege levels change)

## Procedure

### Phase 1: Decompose the Application

Identify and document:

- **Entry points**: APIs, web forms, file uploads, message queues
- **Assets**: user data, credentials, session tokens, business data
- **Trust boundaries**: internet/DMZ, DMZ/internal, app/database, user/admin

### Phase 2: Apply STRIDE to Each Component

For every component that crosses a trust boundary, evaluate six threat types:

| Threat | Question | Example |
|---|---|---|
| **S**poofing | Can an attacker impersonate a user or system? | Forged JWT, stolen API key |
| **T**ampering | Can data be modified in transit or at rest? | Man-in-the-middle, DB manipulation |
| **R**epudiation | Can actions be denied without proof? | Missing audit logs |
| **I**nfo Disclosure | Can sensitive data leak? | Error messages, API over-exposure |
| **D**enial of Service | Can the system be made unavailable? | Resource exhaustion, amplification |
| **E**levation of Privilege | Can a user gain unauthorized access? | Role bypass, SQL injection to admin |

### Phase 3: Risk Assessment

For each identified threat:

- **Likelihood**: Low / Medium / High (based on attack complexity)
- **Impact**: Low / Medium / High / Critical (based on data sensitivity)
- **Risk**: Likelihood x Impact matrix
- **Existing mitigations**: what controls are already in place

### Phase 4: Mitigation Recommendations

Map each threat to concrete mitigations:

- Spoofing: strong authentication, mutual TLS, token validation
- Tampering: integrity checks, signed payloads, immutable audit logs
- Repudiation: comprehensive logging, tamper-evident logs
- Info Disclosure: encryption at rest/transit, minimal error messages
- DoS: rate limiting, circuit breakers, resource quotas
- Elevation: RBAC, principle of least privilege, input validation

## Output

```
## Threat Model: [system name]

| # | Component | Threat (STRIDE) | Description | Likelihood | Impact | Risk | Mitigation |
|---|---|---|---|---|---|---|---|
```

Include a prioritized action list: what to fix first based on risk score.
