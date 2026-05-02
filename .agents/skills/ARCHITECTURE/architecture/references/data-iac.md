# Profile: Data / IaC (AWS)

## Why This Structure Matters

**Problem:** A monolithic `main.tf` with 2000 lines means you can't find anything, can't change anything safely, and can't reuse anything. One-line changes in production require reading thousands of lines to understand blast radius. Hardcoded values mean every environment is a copy-paste disaster.

**Benefit:** Modular infrastructure isolates blast radius — changing the API gateway module can't break the database. Environment separation prevents dev experiments from touching production. Variables with descriptions make the codebase self-documenting.

**Cost of ignoring:** A production incident at 2 AM requires understanding a monolithic file before you can safely fix anything. A new team member hardcodes a value because they didn't know a variable existed. Drift accumulates silently because there's no CI/CD pipeline to catch it.

---

## Detection

- `.tf` files (Terraform)
- `cdk.json` or `cdk.out/` (AWS CDK)
- `template.yaml` or `template.json` (CloudFormation / SAM)
- `requirements.txt` or `pyproject.toml` with AWS dependencies (`boto3`, `aws-cdk-lib`)
- `serverless.yml` (Serverless Framework)

**Disambiguation:** If the project has both `.tf` files and application code (Python, TypeScript), determine whether it's primarily infrastructure (this profile) or an application with some IaC (use the appropriate application profile and reference this one for the IaC portion).

---

## Expected Structure (Terraform)

```
project-root/
  modules/                           # Reusable Terraform modules
    module-name/                     #   One folder per module
      main.tf                        #     Resources
      variables.tf                   #     Input variables with descriptions
      outputs.tf                     #     Output values
      locals.tf                      #     Local computed values (when needed)
      data.tf                        #     Data sources (when needed)
      iam.tf                         #     IAM policies (when needed)
      README.md                      #     What this module does, inputs, outputs
  environments/                      # Per-environment configurations
    dev/
      main.tf                        #     Calls modules with dev values
      terraform.tfvars               #     Dev-specific variable values
      backend.tf                     #     Remote state configuration
    staging/
    prod/
  monitoring/                        # Observability infrastructure
    alerts/                          #   CloudWatch alarms, SNS topics
    dashboards/                      #   CloudWatch dashboard definitions
    logging/                         #   Log groups, metric filters
  scripts/                           # Helper scripts
    deploy.sh                        #   Deployment automation
    validate.sh                      #   Pre-commit validation
    import.sh                        #   State import helpers
  tests/                             # Infrastructure tests
    unit/                            #   Module-level tests (Terratest, tftest)
    integration/                     #   Cross-module integration tests
    compliance/                      #   Policy checks (Checkov, tfsec, OPA)
  docs/                              # Documentation
    architecture.md                  #   Infrastructure architecture overview
    runbooks/                        #   Operational runbooks for incidents
    adrs/                            #   Architecture Decision Records
  .github/workflows/                 # CI/CD pipeline
    terraform-plan.yml               #   Plan on PR
    terraform-apply.yml              #   Apply on merge to main
```

**Key principles:**
- Modules are the unit of reuse — each module does one thing well
- Environments call modules with different values, not different code
- State is always remote (`backend.tf`) — never local
- Monitoring lives alongside the infrastructure it observes
- Tests run in CI before any apply

### When to Split `main.tf` Inside a Module

A module's `main.tf` should be split when it exceeds ~200 lines or mixes concerns:

| File | Contents |
|------|----------|
| `main.tf` | Primary resources (the core of what this module creates) |
| `iam.tf` | IAM roles, policies, instance profiles |
| `data.tf` | Data sources (lookups, existing resources) |
| `locals.tf` | Computed local values |
| `networking.tf` | VPC, subnets, security groups (if module manages networking) |

---

## Expected Structure (CDK — TypeScript)

```
project-root/
  lib/                               # CDK constructs and stacks
    constructs/                      #   Reusable L3 constructs
      ApiGatewayConstruct.ts
      LambdaPipelineConstruct.ts
    stacks/                          #   Stack definitions
      DataPipelineStack.ts
      ApiStack.ts
      MonitoringStack.ts
  bin/                               # CDK app entry point
    app.ts
  config/                            # Environment-specific configuration
    dev.ts
    staging.ts
    prod.ts
  scripts/                           # Deployment and utility scripts
  tests/                             # Unit and integration tests
    unit/
    integration/
  docs/
  cdk.json
  tsconfig.json
```

## Expected Structure (CDK — Python)

```
project-root/
  stacks/                            # Stack definitions
    data_pipeline_stack.py
    api_stack.py
    monitoring_stack.py
  constructs/                        # Reusable constructs
    api_gateway_construct.py
    lambda_pipeline_construct.py
  config/                            # Environment-specific configuration
    dev.py
    staging.py
    prod.py
  tests/
    unit/
    integration/
  app.py                             # CDK app entry point
  cdk.json
  pyproject.toml
```

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Terraform modules | kebab-case | `modules/api-gateway/`, `modules/data-pipeline/` |
| Terraform files | Standard names | `main.tf`, `variables.tf`, `outputs.tf`, `locals.tf` |
| Terraform variables | snake_case, descriptive | `api_gateway_stage_name`, `lambda_memory_size` |
| Terraform locals | snake_case | `account_id`, `region_name`, `common_tags` |
| Terraform resources | snake_case, type prefix implicit | `aws_lambda_function.processor` |
| Data sources | snake_case, context clear | `data.aws_caller_identity.current` |
| IAM policies | descriptive purpose | `allow_lambda_s3_read`, `deny_public_access` |
| CDK constructs (TS) | PascalCase | `ApiGatewayConstruct.ts` |
| CDK stacks (TS) | PascalCase + "Stack" | `DataPipelineStack.ts` |
| CDK constructs (Python) | snake_case files, PascalCase classes | `api_gateway_construct.py` → `class ApiGatewayConstruct` |
| CDK stacks (Python) | snake_case files, PascalCase classes | `data_pipeline_stack.py` → `class DataPipelineStack` |
| Environments | lowercase | `dev/`, `staging/`, `prod/` |
| CloudWatch alarms | resource-metric-condition | `api-gateway-5xx-alarm`, `lambda-errors-critical` |
| CloudWatch dashboards | service-environment | `api-dashboard-prod`, `pipeline-dashboard-dev` |
| S3 buckets | org-service-purpose-env | `acme-data-raw-prod`, `acme-logs-api-dev` |

---

## Red Flags

| Red Flag | Root Cause | Fix |
|----------|-----------|-----|
| Monolithic `main.tf` with all resources | No modularization | Extract into `modules/` by service boundary |
| Hardcoded values (account IDs, regions, names) | Not parameterized | Use variables with descriptions and sensible defaults |
| No `backend.tf` (state stored locally) | State not shared or backed up | Configure remote backend (S3 + DynamoDB for locking) |
| `.tfstate` or `.tfstate.backup` in repo | Secrets exposed in state file | Add both to `.gitignore`, use remote state |
| Secrets in `terraform.tfvars` or variable defaults | Plain-text secrets in source control | Use AWS SSM Parameter Store or Secrets Manager, reference at apply time |
| No `README.md` in modules | Module purpose and usage undocumented | Add README with description, inputs table, outputs table, usage example |
| No tests for infrastructure | Changes deployed without validation | Add Terratest (Go), `terraform test` (native), or Checkov (policy) |
| No CI/CD pipeline | Manual plan/apply, prone to drift | Add GitHub Actions or equivalent for automated plan-on-PR, apply-on-merge |
| CDK stacks over 500 lines | Too many resources in one stack | Extract reusable patterns into L3 constructs |
| No monitoring alongside infrastructure | Alerts configured separately or not at all | Co-locate `monitoring/` with the infrastructure it observes |
| No linting configured | Style inconsistencies, security issues | Add `tflint` for Terraform, `cdk-nag` for CDK |
| No tagging strategy | Resources untrackable for cost/ownership | Define common tags in locals: `environment`, `service`, `owner`, `managed-by` |
| Copy-pasted modules between environments | Environments diverge over time | Call the same modules with different tfvars per environment |

---

## When to Reconsider

| Symptom | Likely Problem | Action |
|---------|---------------|--------|
| Module exceeds 500 lines | Doing too much | Split into focused sub-modules by concern (networking, compute, storage) |
| 5+ environments with copy-pasted configs | Not using module pattern properly | Standardize: one set of modules, one tfvars per environment |
| No one runs `terraform plan` before apply | No CI/CD pipeline | Set up automated plan-on-PR with required approval |
| Infrastructure drift discovered in production | Manual changes outside Terraform | Enable drift detection, add `terraform plan` to a scheduled CI job |
| Changing one module breaks another | Tight coupling between modules | Use outputs/inputs for module boundaries, never reference internals |
| New team member afraid to make changes | No tests, no documentation | Write module READMEs, add compliance tests, document runbooks |
| State file conflicts during team collaboration | Multiple people applying simultaneously | Use remote state with locking (DynamoDB for Terraform, CDK handles via CloudFormation) |
