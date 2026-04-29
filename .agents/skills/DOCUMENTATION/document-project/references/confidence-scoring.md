# Confidence Scoring Methodology

Detailed methodology for calculating confidence scores and determining what requires human review.

## Confidence Score Calculation

### Overall Confidence Formula

```
Overall Confidence = (
    Tech Stack Score * 0.15 +
    Project Structure Score * 0.20 +
    Data Models Score * 0.20 +
    API Specifications Score * 0.20 +
    Coding Standards Score * 0.15 +
    Patterns Score * 0.10
) * 100
```

**Rationale:**
- Project structure, data models, and APIs are most critical (20% each)
- Tech stack and standards are important but easier to verify (15% each)
- Patterns are valuable but less critical (10%)

### Individual Component Scoring

Each component score ranges from 0.0 to 1.0 based on:
- **Explicit Evidence:** Information found explicitly in code/config
- **Consistency:** How uniformly patterns are applied
- **Completeness:** Coverage of expected information

---

## Tech Stack Scoring

### Calculation

```javascript
function calculateTechStackScore(findings) {
    let score = 0;
    let maxScore = 0;

    // Runtime detected (explicit from package.json)
    if (findings.runtime) {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Framework detected
    if (findings.framework) {
        score += findings.framework.confidence === 'explicit' ? 1.0 : 0.7;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Database detected
    if (findings.database) {
        score += findings.database.confidence === 'explicit' ? 1.0 : 0.7;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Key dependencies identified
    if (findings.keyDependencies && findings.keyDependencies.length > 0) {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    return score / maxScore;
}
```

### Confidence Levels

**High (0.85-1.0):**
- All information explicit in package.json/requirements.txt
- Framework and database clearly identified
- No conflicting information

**Example:**
```json
{
  "runtime": "Node.js 20.0.0",
  "framework": "Express.js 4.18.2" (explicit in dependencies),
  "database": "PostgreSQL" (explicit in Prisma schema),
  "dependencies": 15 key libraries identified
}
```

**Medium (0.70-0.84):**
- Some information inferred from imports
- Framework detected but version unclear
- Minor inconsistencies

**Example:**
```json
{
  "runtime": "Node.js" (version unclear),
  "framework": "Express.js" (inferred from imports, version unclear),
  "database": "PostgreSQL" (inferred from connection string),
  "dependencies": Some libraries identified
}
```

**Low (<0.70):**
- Much information missing or inferred
- Conflicting dependencies
- No clear framework detected

---

## Project Structure Scoring

### Calculation

```javascript
function calculateProjectStructureScore(findings) {
    let score = 0;
    let maxScore = 0;

    // Clear directory organization
    if (findings.organization !== 'unknown') {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Project type identified
    if (findings.projectType !== 'unknown') {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Module relationships mapped
    if (findings.dependencyGraph && Object.keys(findings.dependencyGraph).length > 0) {
        // Score based on completeness
        const coverage = findings.dependencyGraph.coverage || 0.5;
        score += coverage;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // No circular dependencies (or identified)
    if (findings.circularDependencies === 0) {
        score += 1.0;
        maxScore += 1.0;
    } else if (findings.circularDependencies !== undefined) {
        score += 0.7; // Detected but exist
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    return score / maxScore;
}
```

### Confidence Levels

**High (0.85-1.0):**
- Clear organizational pattern (by-feature or by-type)
- Project type evident (backend API, frontend app, etc.)
- Complete dependency graph mapped
- No circular dependencies

**Medium (0.70-0.84):**
- Organizational pattern present but mixed
- Project type mostly clear
- Partial dependency graph
- Some circular dependencies identified

**Low (<0.70):**
- No clear organization
- Project type unclear
- Dependency graph incomplete
- Many circular dependencies

---

## Data Models Scoring

### Calculation

```javascript
function calculateDataModelsScore(findings) {
    let score = 0;
    let maxScore = 0;

    // Models found
    if (findings.models && findings.models.length > 0) {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Validation schemas found
    if (findings.validationSchemas && findings.validationSchemas.length > 0) {
        const coverage = findings.validationSchemas.length / findings.models.length;
        score += Math.min(coverage, 1.0);
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Relationships identified
    if (findings.relationships && findings.relationships.length > 0) {
        // Score based on completeness
        const expectedRelationships = findings.models.length * 0.5; // Assume avg 0.5 relationships per model
        const coverage = Math.min(findings.relationships.length / expectedRelationships, 1.0);
        score += coverage;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Data flow documented
    if (findings.dataFlow) {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    return score / maxScore;
}
```

### Confidence Levels

**High (0.85-1.0):**
- All models have explicit definitions (Prisma schema, TypeORM entities, etc.)
- Validation schemas present for all models
- Relationships clearly defined
- Data flow documented

**Medium (0.70-0.84):**
- Models defined but some inferred from interfaces
- Partial validation schema coverage
- Some relationships identified
- Basic data flow understood

**Low (<0.70):**
- Models inferred from code
- No validation schemas found
- Relationships unclear
- Data flow not documented

---

## API Specifications Scoring

### Calculation

```javascript
function calculateAPIScore(findings) {
    let score = 0;
    let maxScore = 0;

    // Endpoints identified
    if (findings.endpoints && findings.endpoints.length > 0) {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Request/response formats documented
    if (findings.requestFormat && findings.responseFormat) {
        score += 1.0;
        maxScore += 1.0;
    } else if (findings.requestFormat || findings.responseFormat) {
        score += 0.5;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Authentication identified
    if (findings.authentication && findings.authentication.type !== 'unknown') {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // OpenAPI/Swagger spec exists
    if (findings.openAPISpec) {
        score += 1.0; // Bonus for explicit API documentation
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    return score / maxScore;
}
```

### Confidence Levels

**High (0.85-1.0):**
- All endpoints identified with explicit route definitions
- Request/response formats consistent and documented
- Authentication mechanism clear
- OpenAPI spec exists (or comprehensive route documentation)

**Medium (0.70-0.84):**
- Most endpoints identified
- Request/response formats mostly consistent
- Authentication detected but details unclear
- No OpenAPI spec but patterns clear

**Low (<0.70):**
- Few endpoints found
- Inconsistent request/response formats
- Authentication mechanism unclear
- No explicit API documentation

---

## Coding Standards Scoring

### Calculation

```javascript
function calculateCodingStandardsScore(findings) {
    let score = 0;
    let maxScore = 0;

    // Code style configuration exists
    if (findings.eslintConfig || findings.prettierConfig) {
        score += 1.0;
        maxScore += 1.0;
    } else {
        score += findings.codeStyleConsistency || 0.5;
        maxScore += 1.0;
    }

    // Naming conventions consistent
    if (findings.namingConventions && findings.namingConventions.consistency > 0.80) {
        score += 1.0;
        maxScore += 1.0;
    } else if (findings.namingConventions) {
        score += findings.namingConventions.consistency;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Error handling consistent
    if (findings.errorHandling && findings.errorHandling.consistency > 0.80) {
        score += 1.0;
        maxScore += 1.0;
    } else if (findings.errorHandling) {
        score += findings.errorHandling.consistency;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Testing standards present
    if (findings.testingStandards && findings.testingStandards.coverage > 0) {
        score += Math.min(findings.testingStandards.coverage / 80, 1.0); // Target 80% coverage
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    return score / maxScore;
}
```

### Confidence Levels

**High (0.85-1.0):**
- ESLint/Prettier config present and enforced
- Naming conventions >90% consistent
- Error handling >90% consistent
- Test coverage >80%

**Medium (0.70-0.84):**
- Some code style config present
- Naming conventions 70-90% consistent
- Error handling 70-90% consistent
- Test coverage 60-80%

**Low (<0.70):**
- No code style config
- Naming conventions inconsistent
- Error handling inconsistent
- Test coverage <60%

---

## Patterns Scoring

### Calculation

```javascript
function calculatePatternsScore(findings) {
    let score = 0;
    let maxScore = 0;

    // Architectural pattern identified
    if (findings.architecturalPattern && findings.architecturalPattern !== 'unknown') {
        score += 1.0;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Design patterns identified
    if (findings.designPatterns && findings.designPatterns.length > 0) {
        // Score based on consistency
        const avgConsistency = findings.designPatterns.reduce((sum, p) => sum + (p.consistency || 0.5), 0) / findings.designPatterns.length;
        score += avgConsistency;
        maxScore += 1.0;
    } else {
        maxScore += 1.0;
    }

    // Few anti-patterns
    if (findings.antiPatterns) {
        const antiPatternPenalty = Math.min(findings.antiPatterns.length * 0.1, 0.5);
        score += (1.0 - antiPatternPenalty);
        maxScore += 1.0;
    } else {
        score += 1.0;
        maxScore += 1.0;
    }

    return score / maxScore;
}
```

### Confidence Levels

**High (0.85-1.0):**
- Clear architectural pattern (layered, clean, hexagonal)
- 3+ design patterns consistently applied
- Few anti-patterns (<3)

**Medium (0.70-0.84):**
- Architectural pattern present but not strict
- 1-2 design patterns identified
- Some anti-patterns (3-5)

**Low (<0.70):**
- No clear architectural pattern
- Few design patterns
- Many anti-patterns (>5)

---

## Human Review Prioritization

### High Priority Review Items (Confidence <70%)

Generate checklist items for sections with <70% confidence:

```markdown
- [ ] **{Section Name}** (Confidence: {confidence}%)
      - Issue: {why confidence is low}
      - Action: {what to verify/add}
      - Impact: {why this matters}
```

### Medium Priority Review Items (Confidence 70-84%)

Generate verification items:

```markdown
- [ ] **{Section Name}** (Confidence: {confidence}%)
      - Verify: {what to check}
```

### Low Priority Review Items (Confidence >84%)

Optional improvements:

```markdown
- [ ] **{Section Name}** - Consider adding {enhancement}
```

---

## Example Confidence Calculation

### Example Project: TypeScript Backend API

**Inputs:**
```json
{
  "techStack": {
    "runtime": "Node.js 20.0.0" (explicit),
    "framework": "Express.js 4.18.2" (explicit),
    "database": "PostgreSQL" (explicit in Prisma schema),
    "dependencies": 15 identified
  },
  "projectStructure": {
    "organization": "by-type (layered)",
    "projectType": "backend API",
    "dependencyGraph": 85% coverage,
    "circularDependencies": 0
  },
  "dataModels": {
    "models": 12 found (Prisma schema),
    "validationSchemas": 10/12 models have Zod schemas,
    "relationships": 15 relationships defined,
    "dataFlow": documented
  },
  "apiSpecifications": {
    "endpoints": 24 identified,
    "requestFormat": consistent,
    "responseFormat": consistent,
    "authentication": "JWT (clear)"
  },
  "codingStandards": {
    "eslintConfig": present,
    "namingConventions": 92% consistent,
    "errorHandling": 88% consistent,
    "testCoverage": 78%
  },
  "patterns": {
    "architecturalPattern": "layered",
    "designPatterns": ["repository", "dependency injection"],
    "antiPatterns": 2
  }
}
```

**Calculation:**
```
Tech Stack Score:        0.95 (explicit info)
Project Structure Score: 0.90 (clear organization)
Data Models Score:       0.92 (comprehensive)
API Specifications Score: 0.85 (all endpoints documented)
Coding Standards Score:  0.88 (good consistency)
Patterns Score:          0.90 (clear patterns)

Overall Confidence = (
    0.95 * 0.15 +
    0.90 * 0.20 +
    0.92 * 0.20 +
    0.85 * 0.20 +
    0.88 * 0.15 +
    0.90 * 0.10
) * 100

= (0.1425 + 0.18 + 0.184 + 0.17 + 0.132 + 0.09) * 100
= 0.8985 * 100
= 89.85%
```

**Result:** **89.85%** - High overall confidence

**Human Review Items:**
- Medium priority: Verify test coverage target (currently 78%, inferred target 80%)
- Low priority: Add 2 missing validation schemas for completeness

---

## Validation Report Template

```markdown
## Confidence Validation Report

**Project:** {name}
**Overall Confidence:** {percentage}%
**Analysis Date:** {YYYY-MM-DD}

### Component Scores

| Component | Score | Confidence Level |
|-----------|-------|------------------|
| Tech Stack | {score}% | {High/Medium/Low} |
| Project Structure | {score}% | {High/Medium/Low} |
| Data Models | {score}% | {High/Medium/Low} |
| API Specifications | {score}% | {High/Medium/Low} |
| Coding Standards | {score}% | {High/Medium/Low} |
| Patterns | {score}% | {High/Medium/Low} |

### Confidence Distribution

- **High Confidence (≥85%):** {count} components
- **Medium Confidence (70-84%):** {count} components
- **Low Confidence (<70%):** {count} components

### Action Items

**High Priority** ({count} items - require review before use):
{list}

**Medium Priority** ({count} items - should verify):
{list}

**Low Priority** ({count} items - optional enhancements):
{list}

### Overall Assessment

{Overall assessment of documentation quality}

**Ready for Use:** {Yes/Yes with review/No}
**Recommended Action:** {Next steps}
```
