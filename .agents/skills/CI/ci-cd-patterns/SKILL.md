---
name: ci-cd-patterns
description: Patterns and best practices for CI/CD pipelines including GitHub Actions, Azure DevOps, GitLab CI, deployment strategies, and security scanning.
---

# CI/CD Patterns

A comprehensive catalog of patterns and best practices for CI/CD pipelines across GitHub Actions, Azure DevOps, GitLab CI, and deployment strategies.

---

## When to Use This Skill

Use this skill when:
- Designing CI/CD pipelines
- Implementing GitHub Actions workflows
- Setting up Azure DevOps pipelines
- Configuring deployment strategies
- Adding security scanning
- Optimizing pipeline performance

---

## Pipeline Stages Pattern

### Standard Pipeline Flow
```
┌──────────┐   ┌───────┐   ┌─────────┐   ┌────────┐   ┌───────────┐   ┌────────────┐
│  Build   │ → │ Test  │ → │ Security│ → │ Package│ → │  Deploy   │ → │   Smoke    │
│          │   │       │   │ Scanning│   │        │   │  Staging  │   │   Tests    │
└──────────┘   └───────┘   └─────────┘   └────────┘   └───────────┘   └────────────┘
                                                                         │
                                                                         ↓
                                                              ┌──────────────────┐
                                                              │ Deploy Production│
                                                              │  (Manual Gate)   │
                                                              └──────────────────┘
```

### Pipeline Configuration (GitHub Actions)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  DOTNET_VERSION: '8.0.x'
  NODE_VERSION: '18.x'

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.nuget/packages
          key: ${{ runner.os }}-nuget-${{ hashFiles('**/packages.lock.json') }}
      
      - name: Build
        run: dotnet build --configuration Release
      
      - name: Test
        run: dotnet test --configuration Release --collect:"XPlat Code Coverage"
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  security:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
      
      - name: Run CodeQL
        uses: github/codeql-action/analyze@v2

  deploy-staging:
    needs: [validate, security]
    runs-on: ubuntu-latest
    environment:
      name: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Staging
        run: ./scripts/deploy.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Production
        run: ./scripts/deploy.sh production
```

---

## Secrets Management Pattern

### GitHub Actions Secrets
```yaml
# ✅ Good: Secrets from vault
steps:
  - name: Deploy
    run: ./deploy.sh
    env:
      DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
      API_KEY: ${{ secrets.API_KEY }}
      AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}

# ❌ Bad: Hardcoded secrets
steps:
  - name: Deploy
    run: |
      export DB_PASSWORD="MySecretPassword123"
      ./deploy.sh
```

### Azure DevOps Variable Groups
```yaml
# azure-pipelines.yml
variables:
- group: 'Production-Secrets'
- name: additionalVar
  value: 'some value'

steps:
- script: |
    echo "Using secret from group: $(DatabasePassword)"
  env:
    DatabasePassword: $(DatabasePassword)
```

---

## Caching Pattern

### Dependency Caching
```yaml
# ✅ Good: Cache NuGet packages
steps:
  - name: Cache NuGet
    uses: actions/cache@v3
    with:
      path: ~/.nuget/packages
      key: ${{ runner.os }}-nuget-${{ hashFiles('**/packages.lock.json') }}
      restore-keys: |
        ${{ runner.os }}-nuget-

  - name: Cache node modules
    uses: actions/cache@v3
    with:
      path: node_modules
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# ❌ Bad: No caching
# Dependencies downloaded on every run
```

### Docker Layer Caching
```yaml
- name: Build Docker image
  uses: docker/build-push-action@v4
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

## Matrix Builds Pattern

### Multi-Configuration Testing
```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        dotnet: ['6.0.x', '7.0.x', '8.0.x']
        exclude:
          - os: macos-latest
            dotnet: '6.0.x'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ matrix.dotnet }}
      
      - name: Test
        run: dotnet test
```

---

## Deployment Strategies

### Blue-Green Deployment
```yaml
jobs:
  deploy-blue-green:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to green slot
        run: |
          az webapp deployment slot swap \
            --resource-group ${{ secrets.RG }} \
            --name ${{ secrets.APP_NAME }} \
            --slot green \
            --target-slot production
      
      - name: Verify deployment
        run: ./scripts/smoke-tests.sh
      
      - name: Swap if successful
        run: |
          az webapp deployment slot swap \
            --resource-group ${{ secrets.RG }} \
            --name ${{ secrets.APP_NAME }} \
            --slot green \
            --target-slot production
      
      - name: Rollback on failure
        if: failure()
        run: |
          az webapp deployment slot swap \
            --resource-group ${{ secrets.RG }} \
            --name ${{ secrets.APP_NAME }} \
            --slot production \
            --target-slot green
```

### Canary Deployment
```yaml
jobs:
  canary:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to 10% of traffic
        run: |
          kubectl set image deployment/app app=myapp:${{ github.sha }} \
            --namespace=production
      
      - name: Monitor metrics for 10 minutes
        run: ./scripts/monitor-canary.sh --duration=600
      
      - name: Promote canary
        if: success()
        run: |
          kubectl set image deployment/app app=myapp:${{ github.sha }} \
            --namespace=production
      
      - name: Rollback canary
        if: failure()
        run: |
          kubectl rollout undo deployment/app \
            --namespace=production
```

### Rolling Update
```yaml
jobs:
  rolling-update:
    runs-on: ubuntu-latest
    steps:
      - name: Start rolling update
        run: |
          kubectl set image deployment/app app=myapp:${{ github.sha }}
      
      - name: Monitor rollout
        run: |
          kubectl rollout status deployment/app --timeout=600s
      
      - name: Verify deployment
        run: ./scripts/health-check.sh
      
      - name: Rollback if needed
        if: failure()
        run: |
          kubectl rollout undo deployment/app
```

---

## Security Scanning Pattern

### Comprehensive Security Pipeline
```yaml
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Dependency scanning
        uses: snyk/actions/dotnet@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Container scanning
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
      
      - name: Code scanning
        uses: github/codeql-action/analyze@v2
        with:
          languages: 'csharp'
      
      - name: Upload security results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## Environment Protection Pattern

### Protected Environments
```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy
        run: ./deploy.sh

# Environment settings (configured in GitHub):
# - Required reviewers: 2
# - Wait timer: 5 minutes
# - Deployment branches: main only
```

### Deployment Gates (Azure DevOps)
```yaml
# Pre-deployment approvals
# - Required approvers: 2
# - Timeout: 72 hours
# - Check: Azure RBAC
# - Check: Work item linking

stages:
- stage: Production
  displayName: 'Production Deployment'
  jobs:
  - deployment: Deploy
    environment: 'Production'
    strategy:
      runOnce:
        deploy:
          steps:
          - script: echo "Deploying to production"
```

---

## Pipeline Performance Pattern

### Performance Targets
```markdown
## Pipeline Performance Targets
- **Build Time**: < 5 minutes
- **Test Time**: < 10 minutes
- **Security Scan**: < 5 minutes
- **Deployment**: < 5 minutes
- **Total Pipeline**: < 25 minutes
```

### Optimization Techniques
```yaml
# ✅ Parallel execution
jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - run: dotnet test --filter "Category=Unit"
  
  test-integration:
    runs-on: ubuntu-latest
    steps:
      - run: dotnet test --filter "Category=Integration"
  
  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - run: dotnet test --filter "Category=E2E"

# ✅ Fail fast
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: dotnet build --no-restore
      - run: dotnet format --verify-no-changes  # Quick check first
  
  test:
    needs: validate  # Only runs if validate passes
```

---

## Quality Gates Pattern

### Required Checks
```markdown
## Quality Gates
- [ ] Code coverage > 80%
- [ ] No critical security vulnerabilities
- [ ] No high security vulnerabilities
- [ ] All tests passing
- [ ] Build successful
- [ ] No linting errors
- [ ] Performance tests passing
```

### Coverage Enforcement
```yaml
- name: Check code coverage
  run: |
    COVERAGE=$(cat coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80%"
      exit 1
    fi
```

---

## Pipeline Metrics Pattern

### Metrics Collection
```yaml
name: Pipeline Metrics

on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types: [completed]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate metrics
        run: |
          echo "Build Duration: ${{ needs.build.outputs.duration }}"
          echo "Test Duration: ${{ needs.test.outputs.duration }}"
          echo "Coverage: ${{ needs.test.outputs.coverage }}"
      
      - name: Send to monitoring
        run: |
          curl -X POST ${{ secrets.MONITORING_WEBHOOK }} \
            -d '{
              "duration": "${{ github.job }}",
              "status": "${{ job.status }}",
              "workflow": "${{ github.workflow }}"
            }'
```

---

## Common Patterns

### PR Validation
```yaml
name: PR Validation

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build
        run: dotnet build
      
      - name: Test
        run: dotnet test
      
      - name: Lint
        run: dotnet format --verify-no-changes
      
      - name: Security Scan
        run: dotnet list package --vulnerable
```

### Scheduled Maintenance
```yaml
name: Weekly Maintenance

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check for outdated
        run: dotnet list package --outdated
      
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: update dependencies'
          branch: 'chore/update-dependencies'
```

---

## Quality Checklist

### Pipeline Quality
- [ ] Pipeline executes successfully
- [ ] Tests run on every commit
- [ ] Security scanning enabled
- [ ] Deployments automated
- [ ] Approval gates for production
- [ ] Rollback procedures defined
- [ ] Notifications configured
- [ ] Metrics tracked

### Security
- [ ] Secrets in vault (not in code)
- [ ] Least privilege for service accounts
- [ ] Security scanning in pipeline
- [ ] Artifact signing
- [ ] Dependency updates automated
- [ ] Pipeline access restricted

### Performance
- [ ] Build time < 5 minutes
- [ ] Test time < 10 minutes
- [ ] Dependencies cached
- [ ] Parallel test execution
- [ ] Incremental builds
- [ ] Docker layer caching

---

## Related Skills

- **infrastructure-as-code-patterns** — IaC best practices
- **security-audit-checklist** — Security assessments
- **cloud-cost-optimization** — Cost optimization

---

## Output Format

When using this skill, provide:
1. **Pipeline configuration** (YAML)
2. **Stage definitions** with clear purposes
3. **Security scanning** integration
4. **Deployment strategy** (blue-green, canary, rolling)
5. **Quality gates** defined
6. **Performance targets** set
7. **Metrics collection** configured
