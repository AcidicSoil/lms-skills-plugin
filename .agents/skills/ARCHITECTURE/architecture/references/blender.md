# Profile: Blender

## Why This Structure Matters

**Problem:** Blender projects accumulate files fast — 20 .blend files with default names, textures scattered across Downloads and Desktop, renders lost in random locations. Without structure, the question "which file is the current version?" has no answer.

**Benefit:** A named main file, channel-organized textures, and separated renders/exports means you always know where the latest version lives, where to find the right texture, and where outputs go.

**Cost of ignoring:** You spend 10 minutes finding a file that should take 2 seconds. Textures break when you move the project because paths were never organized. Renders get overwritten because there's no WIP vs final separation.

---

## Detection

- `.blend` files present
- Texture image files (`.png`, `.jpg`, `.exr`, `.hdr`)
- No `package.json`, no `Assets/` folder, no `.tf` files
- May have Python scripts (`.py`) for Blender automation
- May have geometry caches (`.abc`, `.vdb`) for simulations

---

## Expected Structure

### Single-Asset Project

```
project-root/
  project-name.blend               # Main file (always named after project)
  references/                      # Reference images, concept art, mood boards
  textures/                        # PBR textures, UV maps
    albedo/                        #   Base color maps
    normal/                        #   Normal maps
    roughness/                     #   Roughness maps
    metallic/                      #   Metallic maps
    emission/                      #   Emission maps
    ao/                            #   Ambient occlusion
    displacement/                  #   Displacement/height maps
  hdri/                            # Environment lighting (.hdr, .exr)
  renders/                         # Output renders
    final/                         #   Approved final renders
    wip/                           #   Work-in-progress iterations
    compositing/                   #   Layer renders for post-processing
  exports/                         # Deliverables (FBX, OBJ, glTF, USD)
  scripts/                         # Python scripts for Blender
  _archive/                        # Old versions (moved here, not deleted)
```

**Key principles:**
- The main `.blend` file lives at root, named after the project — never `untitled.blend`
- `_archive/` holds old versions with dates: `project-name_2024-01-15.blend`
- `renders/` is separated from source — never mix outputs with inputs
- `textures/` organized by PBR channel, not by object (unless multi-asset)

### Multi-Asset Project

When a project contains multiple distinct assets (character set, environment kit, modular pieces):

```
project-root/
  character-warrior/
    character-warrior.blend
    textures/
    exports/
  character-mage/
    character-mage.blend
    textures/
    exports/
  _libraries/                      # Shared materials, node groups, HDRIs
    materials/
    node-groups/
    hdri/
  _archive/
  references/
  renders/
    final/
    wip/
```

**Key principles:**
- Each asset gets its own subfolder with self-contained blend + textures + exports
- `_libraries/` holds shared resources (linked, not duplicated)
- References and renders remain at project root (they span all assets)

### Linked Libraries

When using Blender's linked library workflow (appending/linking from other .blend files):

```
_libraries/
  materials.blend                  # Shared material library
  node-groups.blend                # Reusable shader node groups
  base-meshes.blend                # Template geometry
```

**Important:** Linked paths are relative. Moving `_libraries/` breaks all links. Keep it at a stable location and use relative paths in Blender preferences.

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Blend files | kebab-case, descriptive | `character-warrior.blend`, `environment-tavern.blend` |
| Archived versions | name + date | `character-warrior_2024-01-15.blend` |
| Textures (PBR) | object_channel | `warrior_albedo.png`, `warrior_normal.png` |
| Textures (multi-object) | context_object_channel | `env_tree_albedo.png`, `prop_chair_roughness.png` |
| Renders (final) | scene_version | `throne-room_v03.png`, `warrior-turntable_v02.mp4` |
| Renders (WIP) | scene_date | `throne-room_2024-01-15.png` |
| Exports | object_format_variant | `warrior_lowpoly.fbx`, `warrior_highpoly.obj` |
| Scenes (within .blend) | PascalCase | `MainScene`, `RenderSetup`, `UVLayout` |
| Collections | PascalCase hierarchy | `Character > Armor > Helmet`, `Environment > Trees` |
| Node groups | `NG_` prefix | `NG_WoodShader`, `NG_SkinSubsurface`, `NG_FurSetup` |
| Materials | PascalCase, descriptive | `M_WoodOak`, `M_SkinBase`, `M_MetalRusted` |
| Modifiers | Applied order hint | `01_Mirror`, `02_Subdivision`, `03_Shrinkwrap` |

### PBR Channel Reference

| Channel | Suffix | Color Space | Typical Format |
|---------|--------|-------------|----------------|
| Albedo / Base Color | `_albedo` | sRGB | PNG, JPG |
| Normal | `_normal` | Non-Color | PNG |
| Roughness | `_roughness` | Non-Color | PNG |
| Metallic | `_metallic` | Non-Color | PNG |
| Ambient Occlusion | `_ao` | Non-Color | PNG |
| Emission | `_emission` | sRGB | PNG |
| Displacement / Height | `_displacement` | Non-Color | EXR (16-bit) |
| Opacity / Alpha | `_opacity` | Non-Color | PNG |

---

## Red Flags

| Red Flag | Root Cause | Fix |
|----------|-----------|-----|
| `.blend` files named `untitled.blend` or default names | Not renamed after creation | Rename immediately to `project-name.blend` |
| Textures loose in project root | No texture organization | Move to `textures/` with channel subfolders |
| No `renders/` folder | Renders saved to Desktop or Downloads | Create `renders/final/` and `renders/wip/` |
| Textures not named by PBR channel | Can't tell albedo from normal at a glance | Rename to `object_channel.ext` convention |
| No `_archive/` folder and 10+ .blend files at root | Old versions clutter active workspace | Move old versions to `_archive/` with date suffixes |
| Multiple unrelated models in one `.blend` | File grew beyond its scope | Split into separate .blend files per asset |
| No `exports/` folder | Final deliverables mixed with source or lost | Create `exports/` and export there consistently |
| Linked texture paths are absolute | Project breaks when moved to another machine | Convert to relative paths in Blender preferences |
| Renders mixed with source textures | Can't distinguish inputs from outputs | Separate into `textures/` (inputs) and `renders/` (outputs) |
| No reference images for modeling work | Modeling from memory leads to inaccuracy | Add concept art and references to `references/` |
| Single .blend with 20+ collections | File too large, slow to open, hard to navigate | Split by asset or scene into separate files, link as needed |

---

## When to Reconsider

| Symptom | Likely Problem | Action |
|---------|---------------|--------|
| Project has 5+ .blend files at root | No version management | Establish `_archive/` pattern, keep only current files at root |
| Multiple characters or assets in one project | Need per-asset subfolder structure | Switch to multi-asset layout with separate folders per asset |
| Collaborating with others | Linked library paths will break across machines | Use `_libraries/` with relative paths, document setup in README |
| Textures folder has 50+ files flat | Too many channels mixed together | Organize by channel subfolder (`albedo/`, `normal/`, etc.) |
| Render iterations piling up | No WIP vs final separation | Use `renders/wip/` for iterations, `renders/final/` for approved |
| File takes 5+ minutes to open | Too much in one .blend | Split scenes, use linked libraries for shared assets |
