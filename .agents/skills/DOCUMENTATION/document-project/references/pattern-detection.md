# Pattern Detection

Techniques for identifying design patterns, architectural patterns, and common conventions in codebases.

## Design Pattern Detection

### Repository Pattern

**Indicators:**
- Directory named `repositories/` or `repos/`
- Files named `*.repository.ts` or `*Repository.ts`
- Interfaces defining data access methods
- Classes implementing data access abstraction

**Detection Code:**
```javascript
function detectRepositoryPattern(sourceDir) {
    const repositoryFiles = glob.sync(`${sourceDir}/**/repositories/**/*.ts`);
    const repoFiles = glob.sync(`${sourceDir}/**/*.repository.ts`);

    if (repositoryFiles.length > 0 || repoFiles.length > 0) {
        // Check if files follow repository interface pattern
        const hasInterfaces = repositoryFiles.some(file => {
            const content = fs.readFileSync(file, 'utf-8');
            return content.includes('interface') && content.includes('Repository');
        });

        return {
            detected: true,
            confidence: hasInterfaces ? 'high' : 'medium',
            examples: repositoryFiles.slice(0, 3),
            usage: `${repositoryFiles.length} repository files found`
        };
    }

    return { detected: false };
}
```

**Documentation Template:**
```markdown
## Repository Pattern

Used for data access abstraction.

**Implementation:**
```typescript
interface UserRepository {
    findByEmail(email: string): Promise<User | null>;
    create(data: CreateUserDto): Promise<User>;
}
```

**Usage:**
- All database operations go through repositories
- Services depend on repository interfaces (DI)
- Enables easy testing with mocks

**Examples:**
- src/repositories/user.repository.ts
- src/repositories/session.repository.ts

**Consistency:** 95% (most data access uses this pattern)
```

---

### Factory Pattern

**Indicators:**
- Files or classes named `*Factory`
- Methods named `create*` or `build*`
- Centralizes object creation logic

**Detection:**
```typescript
function detectFactoryPattern(sourceDir) {
    const factoryFiles = glob.sync(`${sourceDir}/**/*{Factory,factory}.ts`);

    if (factoryFiles.length > 0) {
        const examples = [];

        for (const file of factoryFiles) {
            const content = fs.readFileSync(file, 'utf-8');

            // Look for create methods
            if (content.match(/create\w+\s*\(/)) {
                examples.push(file);
            }
        }

        return {
            detected: true,
            confidence: examples.length >= 2 ? 'high' : 'medium',
            examples: examples.slice(0, 3)
        };
    }

    return { detected: false };
}
```

---

### Strategy Pattern

**Indicators:**
- Directory named `strategies/`
- Multiple classes implementing same interface
- Context class that uses strategy interface

**Detection:**
```typescript
function detectStrategyPattern(sourceDir) {
    const strategyFiles = glob.sync(`${sourceDir}/**/strategies/**/*.ts`);

    if (strategyFiles.length >= 2) {
        // Check if strategies implement common interface
        const interfaces = new Set();

        for (const file of strategyFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const implementsMatch = content.match(/implements\s+(\w+)/);
            if (implementsMatch) {
                interfaces.add(implementsMatch[1]);
            }
        }

        // If multiple strategies implement same interface, high confidence
        const confidence = interfaces.size === 1 && strategyFiles.length >= 2 ? 'high' : 'medium';

        return {
            detected: true,
            confidence,
            examples: strategyFiles.slice(0, 3)
        };
    }

    return { detected: false };
}
```

---

### Dependency Injection Pattern

**Indicators:**
- Constructor injection
- Interface-based dependencies
- DI container or framework usage

**Detection:**
```typescript
function detectDependencyInjection(sourceDir) {
    const serviceFiles = glob.sync(`${sourceDir}/**/services/**/*.ts`);
    let diCount = 0;

    for (const file of serviceFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for constructor injection
        const constructorMatch = content.match(/constructor\s*\([^)]*:\s*\w+/);
        if (constructorMatch) {
            diCount++;
        }

        // Check for DI decorators (NestJS, etc.)
        if (content.includes('@Injectable') || content.includes('@Inject')) {
            diCount += 2; // Higher confidence with explicit DI
        }
    }

    const confidence = diCount / serviceFiles.length;

    if (confidence > 0.5) {
        return {
            detected: true,
            confidence: confidence > 0.8 ? 'high' : 'medium',
            usage: `${Math.round(confidence * 100)}% of services use DI`
        };
    }

    return { detected: false };
}
```

---

## Architectural Pattern Detection

### Layered Architecture

**Detection:**
```typescript
function detectLayeredArchitecture(sourceDir) {
    const layers = {
        presentation: ['routes', 'controllers', 'handlers'],
        business: ['services', 'usecases', 'application'],
        data: ['repositories', 'daos', 'datasources'],
        domain: ['models', 'entities', 'domain']
    };

    const detectedLayers = {};

    for (const [layerName, layerDirs] of Object.entries(layers)) {
        for (const dir of layerDirs) {
            if (fs.existsSync(`${sourceDir}/${dir}`)) {
                detectedLayers[layerName] = dir;
                break;
            }
        }
    }

    const layerCount = Object.keys(detectedLayers).length;

    if (layerCount >= 3) {
        return {
            detected: true,
            confidence: 'high',
            layers: detectedLayers,
            description: 'Clear separation of concerns into layers'
        };
    }

    return { detected: false };
}
```

---

### Clean Architecture

**Indicators:**
- Core domain models independent of frameworks
- Use cases/application layer
- Dependency inversion (dependencies point inward)

**Detection:**
```typescript
function detectCleanArchitecture(sourceDir) {
    const indicators = {
        entities: fs.existsSync(`${sourceDir}/domain/entities`) || fs.existsSync(`${sourceDir}/entities`),
        useCases: fs.existsSync(`${sourceDir}/usecases`) || fs.existsSync(`${sourceDir}/application`),
        interfaces: fs.existsSync(`${sourceDir}/interfaces`) || fs.existsSync(`${sourceDir}/adapters`),
        infrastructure: fs.existsSync(`${sourceDir}/infrastructure`)
    };

    const score = Object.values(indicators).filter(Boolean).length;

    if (score >= 3) {
        return {
            detected: true,
            confidence: score === 4 ? 'high' : 'medium',
            description: 'Clean Architecture with domain-centric design'
        };
    }

    return { detected: false };
}
```

---

### Hexagonal Architecture (Ports & Adapters)

**Indicators:**
- Core application with port interfaces
- Adapters implementing ports
- Clear inbound/outbound separation

**Detection:**
```typescript
function detectHexagonalArchitecture(sourceDir) {
    const portsExist = fs.existsSync(`${sourceDir}/ports`);
    const adaptersExist = fs.existsSync(`${sourceDir}/adapters`);

    if (portsExist && adaptersExist) {
        return {
            detected: true,
            confidence: 'high',
            description: 'Hexagonal Architecture (Ports & Adapters)'
        };
    }

    // Alternative naming
    const interfacesExist = fs.existsSync(`${sourceDir}/interfaces`);
    const implementationsExist = fs.existsSync(`${sourceDir}/implementations`);

    if (interfacesExist && implementationsExist) {
        return {
            detected: true,
            confidence: 'medium',
            description: 'Hexagonal-like architecture with interface/implementation separation'
        };
    }

    return { detected: false };
}
```

---

## Error Handling Pattern Detection

### Centralized Error Handling

**Express.js Example:**
```typescript
function detectErrorHandling(middlewareDir) {
    const files = glob.sync(`${middlewareDir}/**/*.ts`);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for error handling middleware signature
        if (content.match(/\(\s*err\s*:\s*\w+,\s*req\s*:\s*Request,\s*res\s*:\s*Response,\s*next\s*:\s*NextFunction\s*\)/)) {
            return {
                detected: true,
                type: 'Centralized error handling middleware',
                file: file,
                confidence: 'high'
            };
        }
    }

    return { detected: false };
}
```

### Custom Error Classes

**Detection:**
```typescript
function detectCustomErrorClasses(sourceDir) {
    const errorFiles = glob.sync(`${sourceDir}/**/*{Error,error,Exception}.ts`);
    const customErrors = [];

    for (const file of errorFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Look for classes extending Error
        const matches = content.matchAll(/class\s+(\w+Error|\w+Exception)\s+extends\s+Error/g);
        for (const match of matches) {
            customErrors.push(match[1]);
        }
    }

    if (customErrors.length > 0) {
        return {
            detected: true,
            confidence: 'high',
            errors: customErrors,
            usage: `${customErrors.length} custom error classes defined`
        };
    }

    return { detected: false };
}
```

---

## Testing Pattern Detection

### Test Organization

**Detection:**
```typescript
function analyzeTestOrganization(projectRoot) {
    const patterns = {
        separated: fs.existsSync(`${projectRoot}/tests`) || fs.existsSync(`${projectRoot}/test`),
        colocated: glob.sync(`${projectRoot}/src/**/*.test.ts`).length > 0,
        specFiles: glob.sync(`${projectRoot}/src/**/*.spec.ts`).length > 0
    };

    if (patterns.separated) {
        return {
            organization: 'Separated tests/ directory',
            confidence: 'high'
        };
    } else if (patterns.colocated) {
        return {
            organization: 'Co-located with source (*.test.ts)',
            confidence: 'high'
        };
    } else if (patterns.specFiles) {
        return {
            organization: 'Co-located with source (*.spec.ts)',
            confidence: 'high'
        };
    }

    return { organization: 'Unknown' };
}
```

### Mocking Strategies

**Detection:**
```typescript
function detectMockingStrategy(testFiles) {
    const strategies = {
        jest: 0,
        sinon: 0,
        manual: 0
    };

    for (const file of testFiles.slice(0, 50)) {
        const content = fs.readFileSync(file, 'utf-8');

        if (content.includes('jest.mock(') || content.includes('jest.fn()')) {
            strategies.jest++;
        }

        if (content.includes('sinon.stub') || content.includes('sinon.spy')) {
            strategies.sinon++;
        }

        if (content.includes('class Mock') || content.includes('createMock')) {
            strategies.manual++;
        }
    }

    const primary = Object.entries(strategies).sort((a, b) => b[1] - a[1])[0];

    return {
        strategy: primary[0],
        confidence: primary[1] / testFiles.length > 0.5 ? 'high' : 'medium'
    };
}
```

---

## Anti-Pattern Detection

### God Objects

**Detection:**
```typescript
function detectGodObjects(sourceFiles) {
    const godObjects = [];

    for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n').length;

        // Classes with >500 lines are potential god objects
        if (lines > 500) {
            const classMatch = content.match(/class\s+(\w+)/);
            if (classMatch) {
                godObjects.push({
                    file: file,
                    class: classMatch[1],
                    lines: lines
                });
            }
        }
    }

    return godObjects;
}
```

### Circular Dependencies

**Detection:**
```typescript
function detectCircularDependencies(dependencyGraph) {
    const cycles = [];

    function dfs(node, path, visited) {
        if (path.includes(node)) {
            // Found cycle
            const cycleStart = path.indexOf(node);
            cycles.push(path.slice(cycleStart).concat([node]));
            return;
        }

        if (visited.has(node)) return;

        visited.add(node);
        path.push(node);

        for (const dependency of dependencyGraph.get(node) || []) {
            dfs(dependency, [...path], visited);
        }
    }

    for (const node of dependencyGraph.keys()) {
        dfs(node, [], new Set());
    }

    return cycles;
}
```

### Inconsistent Error Handling

**Detection:**
```typescript
function detectInconsistentErrorHandling(sourceFiles) {
    const patterns = {
        tryLiteralCatch: 0,
        errorClasses: 0,
        promiseReject: 0,
        noHandling: 0
    };

    for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Count error handling patterns
        patterns.tryCatch += (content.match(/try\s*\{/g) || []).length;
        patterns.errorClasses += (content.match(/throw\s+new\s+\w+Error/g) || []).length;
        patterns.promiseReject += (content.match(/\.catch\(/g) || []).length;

        // Functions without error handling
        const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
        const handledCount = patterns.tryCatch + patterns.promiseReject;
        patterns.noHandling += Math.max(0, functionCount - handledCount);
    }

    // Check for inconsistency
    const total = Object.values(patterns).reduce((a, b) => a + b, 0);
    const dominant = Math.max(...Object.values(patterns));

    const consistency = dominant / total;

    return {
        consistent: consistency > 0.7,
        dominantPattern: Object.entries(patterns).find(([k, v]) => v === dominant)[0],
        consistency: Math.round(consistency * 100) + '%'
    };
}
```

---

## Pattern Documentation Template

```markdown
# Design Patterns & Conventions

## {Pattern Name}

{Brief description of pattern and its purpose}

**Implementation:**
```{language}
{Code example showing pattern structure}
```

**Usage:**
- {When to use this pattern}
- {Benefits of using this pattern}
- {Common use cases}

**Examples:**
- {file1.ts} - {description}
- {file2.ts} - {description}

**Consistency:** {percentage}% ({description of consistency})

**Related Patterns:**
- {RelatedPattern1} - {how they relate}
- {RelatedPattern2} - {how they relate}

---
```

## Confidence Scoring for Patterns

**High Confidence (>85%):**
- Pattern explicitly named in code (e.g., `UserRepository` interface)
- Multiple consistent implementations found
- Clear structural indicators present

**Medium Confidence (70-85%):**
- Pattern implied by structure but not explicitly named
- Some implementations found
- Partial structural indicators

**Low Confidence (<70%):**
- Possible pattern but unclear
- Few or inconsistent implementations
- Weak structural indicators
