# Profile: Unity

## Why This Structure Matters

**Problem:** Unity projects grow fast — a hundred scripts loose in `Assets/` with no organization means finding `PlayerController.cs` requires searching, not navigating. Materials, textures, and prefabs mixed together in flat folders make it impossible to know what belongs to which system.

**Benefit:** Feature-based script organization means everything for one system (controller, UI, data) lives together. Asset type separation means you always know where to find materials vs textures vs prefabs.

**Cost of ignoring:** Adding a feature requires searching across 10+ unrelated folders. Refactoring one system accidentally breaks another because dependencies are invisible. Onboarding a new team member takes days instead of hours.

---

## Detection

- `Assets/` folder at root level
- `ProjectSettings/` folder
- `.unity` scene files
- `.cs` (C#) scripts
- `.meta` files alongside every asset and folder
- `Packages/manifest.json` for Unity Package Manager

**Disambiguation:** If VRChat SDK references are present (`Packages/com.vrchat.*`, VRCSDK3 assemblies), use the VRChat profile instead — it extends this one.

---

## Expected Structure

```
project-root/
  Assets/
    Scripts/                         # All C# code
      Features/                      # Feature-based organization
        FeatureName/                 #   Self-contained per feature
          FeatureNameController.cs   #     MonoBehaviour entry point
          FeatureNameUI.cs           #     UI-specific logic
          FeatureNameData.cs         #     Data/state for this feature
          FeatureNameEditor.cs       #     Custom inspector (if needed)
      Core/                          # Shared systems used across features
        Input/                       #   Input system wrappers
        Audio/                       #   Audio manager, sound pools
        Events/                      #   Event bus, message system
        Camera/                      #   Camera controller, transitions
        UI/                          #   Shared UI utilities, base classes
        Persistence/                 #   Save/load, PlayerPrefs wrappers
      Utils/                         # Pure utility functions (no MonoBehaviour)
    Prefabs/                         # Reusable game objects
      Characters/                    #   Player, NPCs, enemies
      Environment/                   #   Props, terrain pieces, obstacles
      UI/                            #   UI panels, HUD elements, menus
      VFX/                           #   Particle systems, visual effects
    Materials/                       # Materials and shaders
    Textures/                        # Texture assets
    Scenes/                          # Scene files only
      Main.unity
      Menu.unity
      Loading.unity
    UI/                              # UI-specific assets (sprites, fonts, icons)
    Audio/                           # Sound effects and music
      SFX/
      Music/
      Ambience/
    Animations/                      # Animation clips and controllers
    Models/                          # 3D model files (FBX, OBJ)
    StreamingAssets/                  # Runtime-loaded files (JSON configs, etc.)
    Resources/                       # Unity runtime loading (use sparingly)
    Editor/                          # Editor-only scripts and tools
      CustomInspectors/              #   Property drawers, custom editors
      Windows/                       #   EditorWindow implementations
      Tools/                         #   Menu items, build scripts, utilities
    Plugins/                         # Third-party plugins (managed externally)
    ThirdParty/                      # Third-party assets (imported into project)
  Tests/                             # Test assemblies
    EditMode/                        #   Tests that run without Play mode
    PlayMode/                        #   Tests that require Play mode runtime
  Packages/                          # Unity Package Manager
  ProjectSettings/                   # Unity project configuration
```

**Key principles:**
- `Scripts/Features/` is the heart — each feature is self-contained with its own controller, UI, and data
- `Core/` holds systems that multiple features depend on — it should never become a dumping ground
- `Editor/` scripts only run in the Unity Editor, never in builds — keep them separate
- `Tests/` lives outside `Assets/` at project root (Unity's recommended location for test assemblies)
- `Resources/` is special — everything in it gets included in the build. Only put assets here that genuinely need `Resources.Load()` at runtime

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Scripts (MonoBehaviour) | PascalCase, descriptive | `PlayerController.cs`, `InventoryManager.cs` |
| Scripts (utility) | PascalCase, function-focused | `MathHelpers.cs`, `StringExtensions.cs` |
| Interfaces | `I` prefix | `IInteractable.cs`, `IDamageable.cs` |
| ScriptableObjects | PascalCase + `Data` or `Config` suffix | `WeaponData.cs`, `GameConfig.cs` |
| ScriptableObject instances | PascalCase, descriptive | `Sword_Iron.asset`, `Config_Difficulty_Hard.asset` |
| Events | Past tense for happened, present for request | `OnPlayerDied`, `OnDamageRequested` |
| Editor scripts | PascalCase + `Editor` suffix | `PlayerControllerEditor.cs`, `WeaponDataDrawer.cs` |
| Scenes | PascalCase | `MainMenu.unity`, `Level_01.unity`, `BossArena.unity` |
| Prefabs | PascalCase, descriptive | `EnemySpawner.prefab`, `HealthBar.prefab` |
| Materials | PascalCase | `WaterSurface.mat`, `CharacterSkin.mat` |
| Animations | PascalCase, action-based | `Walk.anim`, `IdleCombat.anim`, `AttackSlash.anim` |
| Animator controllers | PascalCase + `Controller` | `PlayerController.controller`, `EnemyAI.controller` |
| Folders | PascalCase | `Scripts/`, `Prefabs/`, `Materials/` |
| Test classes | Source + `Tests` suffix | `PlayerControllerTests.cs`, `InventoryTests.cs` |

---

## Red Flags

| Red Flag | Root Cause | Fix |
|----------|-----------|-----|
| Scripts loose in `Assets/` root | No script organization | Move all scripts to `Assets/Scripts/` with feature subfolders |
| Missing `.meta` files | `.gitignore` misconfigured | Ensure `*.meta` files are tracked; only ignore `Library/`, `Temp/`, `Logs/` |
| 100+ scripts flat in `Scripts/` | No feature-based organization | Group into `Features/` subfolders by system |
| `Core/` folder with 30+ scripts | Core became a dumping ground | Split into subsystems (Input/, Audio/, Events/, etc.) |
| Assets in `Resources/` that don't need runtime loading | Misunderstanding of Resources folder | Move to regular asset folders; only keep `Resources.Load()` assets here |
| Scenes mixed with prefabs or materials | No type separation | Move scenes to dedicated `Scenes/` folder |
| Manager singletons everywhere | Over-reliance on global state | Use dependency injection or ScriptableObject-based architecture |
| No `Tests/` folder | No automated testing | Create EditMode tests for utilities, PlayMode tests for behaviors |
| Third-party assets scattered in `Assets/` | No isolation | Move to `Plugins/` or `ThirdParty/` folder |
| Circular dependencies between Features | Features too tightly coupled | Extract shared logic to `Core/`, use events for cross-feature communication |
| Prefabs folder with 50+ items flat | No categorization | Organize into `Characters/`, `Environment/`, `UI/`, `VFX/` subfolders |
| Editor scripts mixed with runtime scripts | Build includes editor-only code | Move all editor code to `Editor/` folders (Unity excludes these from builds) |

---

## When to Reconsider

| Symptom | Likely Problem | Action |
|---------|---------------|--------|
| `Scripts/` has 100+ files with no subfolders | Flat organization doesn't scale | Introduce feature-based folders under `Scripts/Features/` |
| `Core/` has 20+ scripts | Core is becoming monolithic | Split into subsystems: Input/, Audio/, Events/, Camera/ |
| `Prefabs/` is a flat dumping ground | No domain categorization | Organize by domain: Characters/, Environment/, UI/, VFX/ |
| Adding one feature touches 8+ folders | Over-separated by type | Consider co-locating feature assets (scripts + prefabs + materials together) |
| Build size is unexpectedly large | Assets in `Resources/` that shouldn't be | Audit Resources/ folder — move non-runtime assets elsewhere |
| New team member takes a week to navigate | Structure isn't self-documenting | Add README files in key folders, establish naming guide |
| Tests don't exist or are all broken | No testing discipline | Start with EditMode tests for utilities, add PlayMode tests for critical behaviors |
