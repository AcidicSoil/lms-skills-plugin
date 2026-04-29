# Analysis Techniques

Detailed methods for analyzing codebase structure, technology stack, data models, and APIs.

## Project Structure Analysis

### Directory Scanning Techniques

**Basic Tree Analysis:**
```bash
# Get complete directory structure
find src/ -type d | sort

# Count files per directory
find src/ -type f | sed 's|\(.*\)/.*|\1|' | sort | uniq -c

# Analyze directory depth
find src/ -type d -exec bash -c 'echo $(echo {} | tr "/" "\n" | wc -l) {}' \; | sort -n
```

**File Distribution Analysis:**
```bash
# Count files by extension
find src/ -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn

# Average lines per file
find src/ -name "*.ts" -exec wc -l {} \; | awk '{sum+=$1; count++} END {print sum/count}'

# Largest files (potential refactoring candidates)
find src/ -name "*.ts" -exec wc -l {} \; | sort -rn | head -20
```

### Organizational Pattern Detection

**By-Feature vs By-Type:**

```
By-Feature Organization:
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.repository.ts
│   └── auth.types.ts
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.repository.ts

Detection:
- Look for directories with multiple file types (controller + service + repository)
- Check if directory names match domain concepts

By-Type Organization:
src/
├── controllers/
│   ├── auth.controller.ts
│   └── users.controller.ts
├── services/
│   ├── auth.service.ts
│   └── users.service.ts

Detection:
- Look for directories named after architectural layers
- Check if multiple domains coexist in same directory
```

**Detection Algorithm:**
```python
def detect_organization_pattern(directory_structure):
    layer_names = ['controllers', 'services', 'repositories', 'models', 'routes']
    feature_score = 0
    type_score = 0

    for directory in directory_structure:
        # Check if directory contains layer names
        if any(layer in directory.lower() for layer in layer_names):
            type_score += 1

        # Check if directory has multiple file types
        files = get_files_in_directory(directory)
        unique_suffixes = set(f.split('.')[-2] for f in files if '.' in f)
        if len(unique_suffixes) >= 3:  # controller, service, repository
            feature_score += 1

    if type_score > feature_score:
        return "By-Type (Layered)"
    elif feature_score > type_score:
        return "By-Feature (Modular)"
    else:
        return "Hybrid"
```

### Module Dependency Analysis

**Import Graph Construction:**

```typescript
// Parse TypeScript imports
import { parse } from '@typescript-eslint/parser';
import * as fs from 'fs';

function extractImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ast = parse(content, { sourceType: 'module' });

    const imports: string[] = [];

    traverse(ast, {
        ImportDeclaration(path) {
            imports.push(path.node.source.value);
        }
    });

    return imports;
}

function buildDependencyGraph(sourceDir: string): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    // Scan all TypeScript files
    const files = glob.sync(`${sourceDir}/**/*.ts`);

    for (const file of files) {
        const imports = extractImports(file);
        graph.set(file, imports);
    }

    return graph;
}
```

**Circular Dependency Detection:**

```python
def detect_circular_dependencies(dependency_graph):
    """Detect circular dependencies using DFS."""
    def has_cycle(node, visited, rec_stack):
        visited.add(node)
        rec_stack.add(node)

        for neighbor in dependency_graph.get(node, []):
            if neighbor not in visited:
                if has_cycle(neighbor, visited, rec_stack):
                    return True
            elif neighbor in rec_stack:
                return True

        rec_stack.remove(node)
        return False

    visited = set()
    for node in dependency_graph:
        if node not in visited:
            if has_cycle(node, visited, set()):
                return True

    return False
```

---

## Technology Stack Analysis

### Package Manager Detection

**Node.js/JavaScript/TypeScript:**

```bash
# Detect package manager
if [ -f "package-lock.json" ]; then
    echo "npm"
elif [ -f "yarn.lock" ]; then
    echo "yarn"
elif [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
elif [ -f "bun.lockb" ]; then
    echo "bun"
fi
```

**Parse package.json:**
```javascript
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

// Extract dependencies
const dependencies = packageJson.dependencies || {};
const devDependencies = packageJson.devDependencies || {};

// Identify framework
function identifyFramework(deps) {
    if (deps.express) return { type: 'backend', framework: 'Express.js', version: deps.express };
    if (deps.fastify) return { type: 'backend', framework: 'Fastify', version: deps.fastify };
    if (deps['@nestjs/core']) return { type: 'backend', framework: 'NestJS', version: deps['@nestjs/core'] };
    if (deps.react) return { type: 'frontend', framework: 'React', version: deps.react };
    if (deps.vue) return { type: 'frontend', framework: 'Vue', version: deps.vue };
    if (deps.next) return { type: 'fullstack', framework: 'Next.js', version: deps.next };
    return { type: 'unknown', framework: null };
}

const framework = identifyFramework(dependencies);
```

**Python:**

```bash
# Detect Python package manager
if [ -f "requirements.txt" ]; then
    echo "pip (requirements.txt)"
elif [ -f "Pipfile" ]; then
    echo "pipenv"
elif [ -f "pyproject.toml" ]; then
    if grep -q "poetry" pyproject.toml; then
        echo "poetry"
    else
        echo "pip (pyproject.toml)"
    fi
elif [ -f "setup.py" ]; then
    echo "setuptools"
fi
```

**Parse requirements.txt:**
```python
def parse_requirements(file_path='requirements.txt'):
    """Parse Python requirements file."""
    dependencies = {}

    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                # Parse: package==version or package>=version
                if '==' in line:
                    package, version = line.split('==')
                    dependencies[package.strip()] = version.strip()
                elif '>=' in line:
                    package = line.split('>=')[0].strip()
                    dependencies[package] = 'latest'

    return dependencies

# Identify framework
def identify_python_framework(deps):
    if 'django' in deps:
        return {'type': 'backend', 'framework': 'Django', 'version': deps['django']}
    elif 'flask' in deps:
        return {'type': 'backend', 'framework': 'Flask', 'version': deps['flask']}
    elif 'fastapi' in deps:
        return {'type': 'backend', 'framework': 'FastAPI', 'version': deps['fastapi']}
    return {'type': 'unknown', 'framework': None}
```

### Database Detection

**From ORM Configuration:**

```javascript
// Prisma
const prismaSchema = fs.readFileSync('prisma/schema.prisma', 'utf-8');
const dbUrlMatch = prismaSchema.match(/provider\s*=\s*"(\w+)"/);
const database = dbUrlMatch ? dbUrlMatch[1] : 'unknown';
// Possible values: postgresql, mysql, sqlite, mongodb, sqlserver

// TypeORM (TypeScript)
const ormConfig = require('./ormconfig.json');
const database = ormConfig.type; // postgres, mysql, mariadb, sqlite, mongodb

// Sequelize
const config = require('./config/database.json');
const database = config.development.dialect; // postgres, mysql, sqlite, mssql
```

**From Connection Strings:**

```python
import re

def detect_database_from_url(database_url):
    """Detect database type from connection URL."""
    patterns = {
        'postgresql': r'^postgres(ql)?://',
        'mysql': r'^mysql://',
        'mongodb': r'^mongodb(\+srv)?://',
        'redis': r'^redis://',
        'sqlite': r'^sqlite://'
    }

    for db_type, pattern in patterns.items():
        if re.match(pattern, database_url, re.IGNORECASE):
            return db_type

    return 'unknown'
```

---

## Data Model Analysis

### Model File Location Strategies

**TypeScript/JavaScript:**

```bash
# Common locations
find src/ -path "*/models/*.ts" -o -path "*/types/*.ts" -o -path "*/entities/*.ts"

# Prisma schema
cat prisma/schema.prisma

# TypeORM entities
find src/ -name "*.entity.ts"

# Mongoose schemas
find src/ -name "*.schema.ts" -o -name "*.model.ts"
```

**Python:**

```bash
# Django models
find . -name "models.py"

# SQLAlchemy models
find . -name "*model*.py" -path "*/models/*"

# Pydantic models
find . -name "*schema*.py"
```

### Model Parsing Examples

**Prisma Schema Parsing:**

```javascript
function parsePrismaSchema(schemaPath) {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const models = [];

    // Match model blocks
    const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
        const modelName = match[1];
        const fields = match[2];

        // Parse fields
        const fieldLines = fields.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
        const parsedFields = fieldLines.map(line => {
            const [name, type, ...attributes] = line.split(/\s+/);
            return {
                name,
                type,
                attributes: attributes.join(' ')
            };
        });

        models.push({
            name: modelName,
            fields: parsedFields
        });
    }

    return models;
}
```

**TypeScript Interface Parsing:**

```typescript
import { parse } from '@typescript-eslint/parser';

function parseTypeScriptInterfaces(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ast = parse(content, { sourceType: 'module' });

    const interfaces = [];

    traverse(ast, {
        TSInterfaceDeclaration(path) {
            const name = path.node.id.name;
            const properties = path.node.body.body.map(prop => ({
                name: prop.key.name,
                type: getTypeAnnotation(prop.typeAnnotation),
                optional: prop.optional
            }));

            interfaces.push({ name, properties });
        }
    });

    return interfaces;
}
```

### Validation Schema Extraction

**Zod Schema Analysis:**

```typescript
// Example Zod schema
const userSchema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
    age: z.number().min(18).max(120).optional()
});

// Extract validation rules
function extractZodValidation(schemaCode: string) {
    // Parse AST and extract validation chains
    // Returns:
    return {
        email: {
            type: 'string',
            format: 'email',
            maxLength: 255
        },
        password: {
            type: 'string',
            minLength: 8,
            pattern: ['uppercase', 'lowercase', 'digit']
        },
        age: {
            type: 'number',
            minimum: 18,
            maximum: 120,
            optional: true
        }
    };
}
```

---

## API Pattern Analysis

### Endpoint Extraction

**Express.js Routes:**

```javascript
function extractExpressRoutes(routesDir) {
    const routes = [];
    const files = glob.sync(`${routesDir}/**/*.ts`);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Match route definitions
        const routeRegex = /router\.(get|post|put|patch|delete|options)\(['"]([^'"]+)['"],\s*(\w+)/g;
        let match;

        while ((match = routeRegex.exec(content)) !== null) {
            routes.push({
                method: match[1].toUpperCase(),
                path: match[2],
                handler: match[3],
                file: file
            });
        }
    }

    return routes;
}
```

**FastAPI Routes (Python):**

```python
import ast

def extract_fastapi_routes(file_path):
    """Extract FastAPI route decorators."""
    with open(file_path, 'r') as f:
        tree = ast.parse(f.read())

    routes = []

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for decorator in node.decorator_list:
                if isinstance(decorator, ast.Call):
                    # @app.get("/path")
                    if hasattr(decorator.func, 'attr'):
                        method = decorator.func.attr
                        if method in ['get', 'post', 'put', 'delete', 'patch']:
                            path = decorator.args[0].s if decorator.args else None
                            routes.append({
                                'method': method.upper(),
                                'path': path,
                                'handler': node.name
                            })

    return routes
```

### Request/Response Pattern Analysis

**Extract Request Validation:**

```typescript
// Detect validation middleware
function findValidationMiddleware(routeFile: string) {
    const content = fs.readFileSync(routeFile, 'utf-8');

    // Check for Zod validation
    if (content.includes('z.object') || content.includes('zodSchema')) {
        return 'Zod';
    }

    // Check for Joi validation
    if (content.includes('Joi.object') || content.includes('.validate(')) {
        return 'Joi';
    }

    // Check for express-validator
    if (content.includes('body(') || content.includes('check(')) {
        return 'express-validator';
    }

    return 'None detected';
}
```

**Extract Response Format:**

```javascript
function analyzeResponseFormat(handlerFiles) {
    const responses = [];

    for (const file of handlerFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Find res.json() or res.status().json() calls
        const jsonRegex = /res(?:\.status\((\d+)\))?\.json\(([^)]+)\)/g;
        let match;

        while ((match = jsonRegex.exec(content)) !== null) {
            responses.push({
                statusCode: match[1] || '200',
                body: match[2],
                file: file
            });
        }
    }

    // Analyze common patterns
    const formats = new Map();
    for (const response of responses) {
        // Detect if response has { data: ..., meta: ... } pattern
        if (response.body.includes('data:') && response.body.includes('meta:')) {
            formats.set('data-meta', (formats.get('data-meta') || 0) + 1);
        }
        // Detect { error: ..., details: ... } pattern
        else if (response.body.includes('error:')) {
            formats.set('error', (formats.get('error') || 0) + 1);
        }
    }

    // Return most common format
    return Array.from(formats.entries()).sort((a, b) => b[1] - a[1]);
}
```

### Authentication Pattern Detection

```javascript
function detectAuthPattern(middlewareDir) {
    const files = glob.sync(`${middlewareDir}/**/*.ts`);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // JWT detection
        if (content.includes('jsonwebtoken') || content.includes('jwt.verify')) {
            const expiryMatch = content.match(/expiresIn:\s*['"]([^'"]+)['"]/);
            return {
                type: 'JWT',
                expiry: expiryMatch ? expiryMatch[1] : 'unknown',
                header: 'Authorization: Bearer <token>'
            };
        }

        // Session detection
        if (content.includes('express-session') || content.includes('req.session')) {
            return {
                type: 'Session-based',
                cookie: 'connect.sid'
            };
        }

        // API Key detection
        if (content.includes('x-api-key') || content.includes('api-key')) {
            return {
                type: 'API Key',
                header: 'X-API-Key' or 'API-Key'
            };
        }
    }

    return { type: 'None detected' };
}
```

---

## Coding Standards Analysis

### Code Style Detection

```javascript
function analyzeCodeStyle(sourceFiles) {
    const styles = {
        indentation: new Map(),
        quotes: new Map(),
        semicolons: { count: 0, total: 0 }
    };

    for (const file of sourceFiles.slice(0, 100)) { // Sample first 100 files
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
            // Detect indentation
            const indentMatch = line.match(/^(\s+)/);
            if (indentMatch) {
                const indent = indentMatch[1];
                if (indent.startsWith('\t')) {
                    styles.indentation.set('tabs', (styles.indentation.get('tabs') || 0) + 1);
                } else {
                    const spaceCount = indent.length;
                    styles.indentation.set(`${spaceCount} spaces`, (styles.indentation.get(`${spaceCount} spaces`) || 0) + 1);
                }
            }

            // Detect quotes
            const singleQuotes = (line.match(/'/g) || []).length;
            const doubleQuotes = (line.match(/"/g) || []).length;
            styles.quotes.set('single', (styles.quotes.get('single') || 0) + singleQuotes);
            styles.quotes.set('double', (styles.quotes.get('double') || 0) + doubleQuotes);

            // Detect semicolons
            if (line.trim().endsWith(';')) {
                styles.semicolons.count++;
            }
            if (line.trim().length > 0) {
                styles.semicolons.total++;
            }
        }
    }

    return {
        indentation: getMostCommon(styles.indentation),
        quotes: getMostCommon(styles.quotes),
        semicolons: styles.semicolons.count / styles.semicolons.total > 0.5 ? 'required' : 'optional'
    };
}
```

### Naming Convention Detection

```python
import re
from collections import Counter

def analyze_naming_conventions(source_files):
    """Detect naming conventions from source code."""
    variable_names = []
    function_names = []
    class_names = []
    file_names = []

    for file in source_files[:100]:  # Sample
        with open(file, 'r') as f:
            content = f.read()

        # Extract names using regex (simplified)
        variables = re.findall(r'(?:const|let|var)\s+(\w+)', content)
        functions = re.findall(r'function\s+(\w+)', content)
        classes = re.findall(r'class\s+(\w+)', content)

        variable_names.extend(variables)
        function_names.extend(functions)
        class_names.extend(classes)

        file_names.append(os.path.basename(file).split('.')[0])

    # Detect patterns
    def detect_case(names):
        cases = Counter()
        for name in names:
            if re.match(r'^[a-z]+(?:[A-Z][a-z]*)*$', name):
                cases['camelCase'] += 1
            elif re.match(r'^[A-Z][a-z]+(?:[A-Z][a-z]*)*$', name):
                cases['PascalCase'] += 1
            elif re.match(r'^[a-z]+(?:_[a-z]+)*$', name):
                cases['snake_case'] += 1
            elif re.match(r'^[A-Z_]+$', name):
                cases['UPPER_SNAKE_CASE'] += 1
            elif re.match(r'^[a-z]+(?:-[a-z]+)*$', name):
                cases['kebab-case'] += 1

        return cases.most_common(1)[0][0] if cases else 'unknown'

    return {
        'variables': detect_case(variable_names),
        'functions': detect_case(function_names),
        'classes': detect_case(class_names),
        'files': detect_case(file_names)
    }
```
