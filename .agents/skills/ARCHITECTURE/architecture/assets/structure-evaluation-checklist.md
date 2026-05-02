# Structure Evaluation Checklist

Use this checklist when auditing any project's folder structure. Start with the universal checks, then apply the type-specific section that matches.

---

## Universal Structure Health Check

These apply to every project regardless of type.

### Organizing Principle
- [ ] Clear organizing principle exists (by feature, by layer, by type, or hybrid)
- [ ] Principle applied consistently — no sections that follow a different pattern
- [ ] Someone new could guess where a file lives without searching

### Naming
- [ ] One casing convention used across all folders (kebab-case, PascalCase, etc.)
- [ ] One casing convention used across all files of the same type
- [ ] File names describe contents — no `utils.ts`, `misc/`, `stuff/`, `helpers.py`
- [ ] No meaningless names on assets (`IMG_4521.jpg`, `untitled.blend`, `Untitled-1.psd`)

### Depth & Balance
- [ ] No folder more than 4 levels deep containing a single file
- [ ] No single folder with 40+ files next to a sibling with 2
- [ ] No empty folders unless part of an intentional repeating pattern (templates, scaffolding)

### Entry Point
- [ ] Root README exists and orients newcomers
- [ ] Clear entry point file (index, main, app — whatever fits)
- [ ] Major folders have a README if their name alone doesn't explain purpose

### Hygiene
- [ ] No orphaned files (nothing imports or references them)
- [ ] No stale build artifacts in source control (dist/, build/, *.pyc)
- [ ] `.gitignore` covers generated files, secrets, and dependencies
- [ ] No commented-out files or `_old`/`_backup` suffixes lingering in active directories

---

## Web (React / Node)

- [ ] Three tiers exist and are named clearly (presentation / logic / data)
- [ ] No API calls or data fetching in the presentation tier
- [ ] No business logic inside React components (thin components, logic in services)
- [ ] Components co-locate their test, styles, and types in the same folder
- [ ] Shared hooks, utilities, and types live in predictable locations
- [ ] Config and environment files are at root, not scattered (`config/`, `.env.example`)
- [ ] No `utils/` or `helpers/` dumping ground with unrelated functions
- [ ] Static assets organized by type (icons, images, fonts — not mixed)

---

## Unity

- [ ] All scripts live under `Assets/Scripts/`, not scattered through `Assets/`
- [ ] Scripts organized by feature, not flat (Features/PlayerMovement/, Features/Inventory/)
- [ ] `Core/` subsystems are separated (Input/, Audio/, Events/ — not one monolithic folder)
- [ ] Every asset file has a corresponding `.meta` file tracked in git
- [ ] Third-party assets isolated in `Plugins/` or `ThirdParty/`
- [ ] Scenes have their own folder, not mixed with prefabs or materials
- [ ] `Resources/` only contains assets that genuinely need runtime loading
- [ ] Test folders exist (EditMode and PlayMode tests)

---

## VRChat

- [ ] Project content lives under `_Project/` (underscore prefix for sort order)
- [ ] Udon scripts organized by system (Interactions/, Systems/, Networking/)
- [ ] Avatar assets grouped by avatar name with clear subfolder structure
- [ ] Expression menus, parameters, and controllers are co-located per avatar
- [ ] Textures are within performance limits (2048x2048 max for worlds, 1024 for avatars)
- [ ] PhysBone configurations are separated from animation controllers
- [ ] Third-party tools (AudioLink, etc.) isolated in `Plugins/`

---

## Blender

- [ ] Main `.blend` file named after the project (not `untitled.blend`)
- [ ] Reference images live in `references/`, not loose in root
- [ ] Textures organized by channel (`textures/albedo/`, `textures/normal/`)
- [ ] Renders separated from source files (`renders/final/`, `renders/wip/`)
- [ ] Exports have their own folder (`exports/`)
- [ ] Old versions archived (`_archive/`) rather than cluttering the root
- [ ] Texture names follow `object_channel` convention (`warrior_albedo.png`)

---

## Data / IaC (AWS)

- [ ] Infrastructure split into reusable modules (not monolithic `main.tf`)
- [ ] Each module has `main.tf`, `variables.tf`, `outputs.tf`, and a `README.md`
- [ ] Environment-specific configs separated (`environments/dev/`, `environments/prod/`)
- [ ] No hardcoded values — variables with descriptions and defaults where safe
- [ ] `.tfstate` and `.tfstate.backup` in `.gitignore`
- [ ] No secrets in `terraform.tfvars` or variable defaults (use SSM/Secrets Manager)
- [ ] Tests exist for infrastructure code (Terratest, policy checks, plan validation)
- [ ] CI/CD pipeline configuration present for automated plan/apply
