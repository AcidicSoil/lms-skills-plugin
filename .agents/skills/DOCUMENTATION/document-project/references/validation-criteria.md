# Project Validation Criteria

## Purpose

Comprehensive validation rules for determining if a project is suitable for automated documentation generation.

---

## Validation Checklist

### 1. Codebase Path Validation

**Check:** Codebase path exists and is accessible

```bash
# Verify path exists
if [ ! -d "$CODEBASE_PATH" ]; then
  echo "❌ Codebase path not found: $CODEBASE_PATH"
  exit 1
fi

# Verify path is readable
if [ ! -r "$CODEBASE_PATH" ]; then
  echo "❌ Codebase path not readable: $CODEBASE_PATH"
  exit 1
fi

echo "✓ Codebase path valid: $CODEBASE_PATH"
```

**Halt if:**
- Path does not exist
- Path is not readable
- Path is empty (no files)

---

### 2. Project Structure Validation

**Check:** Project has recognizable structure

**Backend API Detection:**
```bash
# Look for backend patterns
routes_dir=$(find "$CODEBASE_PATH" -type d -name "routes" -o -name "controllers" | head -1)
services_dir=$(find "$CODEBASE_PATH" -type d -name "services" | head -1)

if [ -n "$routes_dir" ] || [ -n "$services_dir" ]; then
  echo "✓ Backend API structure detected"
  PROJECT_TYPE="backend-api"
fi
```

**Frontend App Detection:**
```bash
# Look for frontend patterns
components_dir=$(find "$CODEBASE_PATH" -type d -name "components" | head -1)
pages_dir=$(find "$CODEBASE_PATH" -type d -name "pages" | head -1)

if [ -n "$components_dir" ] || [ -n "$pages_dir" ]; then
  echo "✓ Frontend app structure detected"
  PROJECT_TYPE="frontend-app"
fi
```

**Library Detection:**
```bash
# Look for library patterns
lib_dir=$(find "$CODEBASE_PATH" -type d -name "lib" | head -1)
src_dir=$(find "$CODEBASE_PATH" -type d -name "src" | head -1)
dist_dir=$(find "$CODEBASE_PATH" -type d -name "dist" | head -1)

if [ -n "$lib_dir" ] && [ -n "$dist_dir" ]; then
  echo "✓ Library structure detected"
  PROJECT_TYPE="library"
fi
```

**Monorepo Detection:**
```bash
# Look for monorepo patterns
packages_dir=$(find "$CODEBASE_PATH" -maxdepth 2 -type d -name "packages" | head -1)
apps_dir=$(find "$CODEBASE_PATH" -maxdepth 2 -type d -name "apps" | head -1)

if [ -n "$packages_dir" ] || [ -n "$apps_dir" ]; then
  echo "✓ Monorepo structure detected"
  PROJECT_TYPE="monorepo"
fi
```

**Halt if:**
- No recognizable project structure
- Empty directories only
- No code files found

---

### 3. Language Detection and Support

**Primary Language Detection:**

```bash
# Count files by extension
ts_count=$(find "$CODEBASE_PATH" -name "*.ts" -not -path "*/node_modules/*" | wc -l)
js_count=$(find "$CODEBASE_PATH" -name "*.js" -not -path "*/node_modules/*" | wc -l)
py_count=$(find "$CODEBASE_PATH" -name "*.py" | wc -l)
go_count=$(find "$CODEBASE_PATH" -name "*.go" | wc -l)
java_count=$(find "$CODEBASE_PATH" -name "*.java" | wc -l)
rs_count=$(find "$CODEBASE_PATH" -name "*.rs" | wc -l)

total=$((ts_count + js_count + py_count + go_count + java_count + rs_count))

# Calculate percentages
ts_pct=$((ts_count * 100 / total))
js_pct=$((js_count * 100 / total))
py_pct=$((py_count * 100 / total))

echo "Language Distribution:"
echo "- TypeScript: $ts_pct% ($ts_count files)"
echo "- JavaScript: $js_pct% ($js_count files)"
echo "- Python: $py_pct% ($py_count files)"
```

**Supported Languages:**

| Language | Support Level | Confidence |
|----------|--------------|------------|
| TypeScript | ✅ Excellent | 95% |
| JavaScript | ✅ Excellent | 95% |
| Python | ✅ Good | 85% |
| Go | ✅ Good | 85% |
| Java/Kotlin | ✅ Good | 80% |
| Rust | ✅ Good | 80% |
| PHP | ⚠️ Basic | 60% |
| Ruby | ⚠️ Basic | 60% |
| C#/.NET | ⚠️ Basic | 60% |
| Other | ❌ Unsupported | <50% |

**Halt if:**
- Primary language is unsupported (not in above list)
- Multiple languages with no clear primary (>40% each)
- Confidence would be <50%

---

### 4. Codebase Size Validation

**Calculate Total Size:**

```bash
# Count all code files (exclude tests, node_modules, etc.)
total_files=$(find "$CODEBASE_PATH" \
  -type f \
  \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/vendor/*" \
  -not -path "*/.venv/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" | wc -l)

# Count lines of code
total_lines=$(find "$CODEBASE_PATH" \
  -type f \
  \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/vendor/*" \
  -not -path "*/.venv/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -exec wc -l {} + | tail -1 | awk '{print $1}')

echo "Codebase Size:"
echo "- Total files: $total_files"
echo "- Total lines: $total_lines"
```

**Size Categories:**

| Size (LOC) | Category | Analysis Time | Confidence | Recommendation |
|------------|----------|---------------|------------|----------------|
| <5K | Too Small | 1-2 min | Low (60%) | ⚠️ May lack patterns |
| 5K-10K | Small | 2-3 min | Medium (70%) | ✅ Acceptable |
| 10K-50K | Ideal | 5-8 min | High (85%) | ✅ Optimal |
| 50K-100K | Large | 8-12 min | High (80%) | ✅ Good |
| 100K-250K | Very Large | 15-25 min | Medium (70%) | ⚠️ May be slow |
| 250K-500K | Huge | 30-60 min | Medium (65%) | ⚠️ Consider subsetting |
| >500K | Too Large | >60 min | Low (50%) | ❌ Not recommended |

**Halt if:**
- Codebase >500K lines (too large, too slow)
- Codebase <1K lines (too small, insufficient patterns)
- Analysis time would exceed 60 minutes

---

### 5. Package Manager Detection

**Node.js Projects:**

```bash
# Look for package.json
if [ -f "$CODEBASE_PATH/package.json" ]; then
  echo "✓ Node.js project detected (package.json)"
  PACKAGE_MANAGER="npm/yarn/pnpm"

  # Read package.json
  pkg_name=$(jq -r '.name' "$CODEBASE_PATH/package.json")
  pkg_version=$(jq -r '.version' "$CODEBASE_PATH/package.json")

  echo "  - Name: $pkg_name"
  echo "  - Version: $pkg_version"
fi
```

**Python Projects:**

```bash
# Look for Python package files
if [ -f "$CODEBASE_PATH/requirements.txt" ]; then
  echo "✓ Python project detected (requirements.txt)"
  PACKAGE_MANAGER="pip"
elif [ -f "$CODEBASE_PATH/pyproject.toml" ]; then
  echo "✓ Python project detected (pyproject.toml)"
  PACKAGE_MANAGER="poetry"
elif [ -f "$CODEBASE_PATH/Pipfile" ]; then
  echo "✓ Python project detected (Pipfile)"
  PACKAGE_MANAGER="pipenv"
fi
```

**Go Projects:**

```bash
# Look for go.mod
if [ -f "$CODEBASE_PATH/go.mod" ]; then
  echo "✓ Go project detected (go.mod)"
  PACKAGE_MANAGER="go modules"

  # Read module name
  module_name=$(grep "^module " "$CODEBASE_PATH/go.mod" | awk '{print $2}')
  echo "  - Module: $module_name"
fi
```

**Java Projects:**

```bash
# Look for Maven or Gradle
if [ -f "$CODEBASE_PATH/pom.xml" ]; then
  echo "✓ Java project detected (pom.xml)"
  PACKAGE_MANAGER="maven"
elif [ -f "$CODEBASE_PATH/build.gradle" ] || [ -f "$CODEBASE_PATH/build.gradle.kts" ]; then
  echo "✓ Java/Kotlin project detected (Gradle)"
  PACKAGE_MANAGER="gradle"
fi
```

**Rust Projects:**

```bash
# Look for Cargo.toml
if [ -f "$CODEBASE_PATH/Cargo.toml" ]; then
  echo "✓ Rust project detected (Cargo.toml)"
  PACKAGE_MANAGER="cargo"

  # Read package name
  pkg_name=$(grep "^name = " "$CODEBASE_PATH/Cargo.toml" | cut -d'"' -f2)
  echo "  - Package: $pkg_name"
fi
```

**Halt if:**
- No package manager detected (can't identify dependencies)
- Multiple conflicting package managers (unclear primary language)

---

### 6. Existing Documentation Check

**Look for Existing Docs:**

```bash
# Common documentation locations
docs_paths=(
  "docs/architecture.md"
  "doc/architecture.md"
  "ARCHITECTURE.md"
  "docs/standards.md"
  "STANDARDS.md"
  "docs/patterns.md"
  "PATTERNS.md"
)

existing_docs=()

for doc_path in "${docs_paths[@]}"; do
  full_path="$CODEBASE_PATH/$doc_path"
  if [ -f "$full_path" ]; then
    # Get last modified date
    mod_date=$(stat -c %y "$full_path" 2>/dev/null | cut -d' ' -f1)
    size=$(wc -l < "$full_path")

    echo "✓ Found existing doc: $doc_path"
    echo "  - Last modified: $mod_date"
    echo "  - Size: $size lines"

    existing_docs+=("$doc_path")
  fi
done
```

**Prompt User for Handling:**

If existing docs found:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Existing Documentation Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found:
- docs/architecture.md (last modified: 6 months ago, 1,250 lines)
- STANDARDS.md (last modified: 1 year ago, 450 lines)

How should we handle existing documentation?

A) Merge: Preserve existing docs, add new findings
   - Keeps all existing content
   - Adds new sections discovered from code
   - Updates outdated sections with current findings
   - Recommended for maintained projects

B) Replace: Generate fresh documentation
   - Backs up existing docs to docs/.backup/
   - Generates completely new documentation
   - Recommended if existing docs are very outdated

C) Supplement: Keep existing, create supplemental docs
   - Leaves existing docs untouched
   - Creates new files with "_generated" suffix
   - Useful for comparison before committing

D) Cancel: Do not proceed
   - Exit without generating documentation

Your choice (A/B/C/D): [Default: A]
```

---

### 7. Analysis Time Estimation

**Estimate Based on Codebase Size:**

```typescript
function estimateAnalysisTime(totalLines: number, totalFiles: number): number {
  // Base time per 1000 lines: ~6 seconds
  const timePerKLines = 6; // seconds

  // Base time per file: ~0.1 seconds
  const timePerFile = 0.1; // seconds

  // Calculate estimates
  const linesTime = (totalLines / 1000) * timePerKLines;
  const filesTime = totalFiles * timePerFile;

  // Total time (in seconds)
  const totalSeconds = linesTime + filesTime;

  // Add overhead (parsing, analysis, doc generation): 20%
  const withOverhead = totalSeconds * 1.2;

  // Convert to minutes
  const minutes = Math.ceil(withOverhead / 60);

  return minutes;
}
```

**Example Estimates:**

| LOC | Files | Est. Time |
|-----|-------|-----------|
| 10K | 50 | 3-4 min |
| 25K | 120 | 5-6 min |
| 50K | 250 | 8-10 min |
| 100K | 500 | 15-18 min |
| 250K | 1200 | 35-40 min |

**Present to User:**

```
Project Analysis Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: my-awesome-api
Path: src/
Language: TypeScript (85%), JavaScript (15%)
Total files: 247
Total lines: 42,350
Package manager: npm (package.json found)

Estimated analysis time: 5-10 minutes

Documentation to generate:
- docs/architecture.md
- docs/standards.md
- docs/patterns.md

Existing docs: docs/architecture.md (6 months old)
Handling mode: Merge (preserve + update)

Analysis will:
✓ Scan 247 files
✓ Analyze project structure
✓ Extract technology stack
✓ Document data models
✓ Map API patterns
✓ Identify coding standards
✓ Detect design patterns
✓ Generate confidence scores
✓ Create human review checklist

Proceed with automated documentation? (yes/no): _
```

---

### 8. User Confirmation

**Confirmation Required Before Proceeding:**

```bash
read -p "Proceed with automated documentation? (yes/no): " confirm

if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ]; then
  echo "❌ Documentation generation cancelled by user"
  exit 0
fi

echo "✓ User confirmed - proceeding with analysis"
```

---

## Validation Flow

```
1. Check codebase path exists
   ↓
2. Detect project structure (backend/frontend/library/monorepo)
   ↓
3. Detect primary language(s)
   ↓
4. Verify language is supported
   ↓
5. Calculate codebase size
   ↓
6. Verify size is within limits (1K-500K lines)
   ↓
7. Detect package manager
   ↓
8. Check for existing documentation
   ↓ (if found)
9. Prompt user for handling mode
   ↓
10. Estimate analysis time
    ↓
11. Present summary to user
    ↓
12. Get user confirmation
    ↓
13. PROCEED or HALT
```

---

## Halt Conditions

**Validation MUST halt if:**

1. **Codebase path not found or not readable**
   - Error: Path does not exist
   - Action: Prompt user to check configuration

2. **No recognizable project structure**
   - Error: Cannot determine project type
   - Action: Manual documentation required

3. **Unsupported language**
   - Error: Primary language not in supported list
   - Action: Cannot generate reliable documentation

4. **Codebase too large (>500K lines)**
   - Error: Analysis would take >60 minutes
   - Action: Consider subsetting or manual documentation

5. **Codebase too small (<1K lines)**
   - Error: Insufficient patterns for analysis
   - Action: Write documentation manually

6. **No package manager detected**
   - Error: Cannot identify dependencies
   - Action: Cannot generate tech stack documentation

7. **User declines to proceed**
   - User cancelled operation
   - Action: Exit gracefully

---

## Success Criteria

**Validation passes when:**

- ✅ Codebase path exists and is readable
- ✅ Project structure is recognizable
- ✅ Primary language is supported (>60% confidence)
- ✅ Codebase size is 1K-500K lines
- ✅ Package manager detected
- ✅ User confirmed to proceed
- ✅ Existing docs handling mode selected (if applicable)

---

*Part of document-project skill - BMAD Enhanced*
