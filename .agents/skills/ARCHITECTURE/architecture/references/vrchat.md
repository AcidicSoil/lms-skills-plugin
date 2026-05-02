# Profile: VRChat (extends Unity)

## Why This Structure Matters

**Problem:** VRChat worlds accumulate 50+ scripts, dozens of materials, and complex animator setups. Without clear organization, finding the script that handles a door trigger means searching through an unstructured pile. Debugging network sync issues is impossible when synced variables are scattered across unrelated scripts.

**Benefit:** Separating interactions, systems, and networking by folder means you can trace any behavior to its source. Co-locating avatar expressions, controllers, and PhysBones by avatar name means everything for one avatar lives together.

**Cost of ignoring:** A world with 30 Udon scripts and no folders becomes unmaintainable. An avatar project with materials mixed between three avatars leads to accidentally breaking one while editing another.

---

## Detection

A VRChat project is always a Unity project. When both Unity and VRChat indicators are present, apply this profile (it overrides the base Unity profile).

**Primary indicators:**
- `Packages/com.vrchat.worlds` or `Packages/com.vrchat.avatars` in the Packages manifest
- References to `VRChat SDK`, `VRCSDK3`, or `VRC` assemblies
- `UdonSharp` or `UdonBehaviour` scripts (`.cs` files with `[UdonBehaviourSyncMode]`)

**Secondary indicators:**
- `.controller` files with VRC-specific layers (Action, FX, Gesture, Sitting)
- `.asset` files containing VRC expression parameters or menus
- `VRCWorld` or `VRCAvatarDescriptor` components in scene files

**Disambiguation:** If you see `Assets/` and `.cs` scripts but no VRC SDK references, use the Unity profile instead.

---

## Expected Structure (World)

```
Assets/
  _Project/                          # Your content (underscore sorts first in Unity)
    Scripts/                         # All Udon/UdonSharp scripts
      Interactions/                  # Player-triggered behaviors
        Pickups/                     #   Grabbable objects
        Buttons/                     #   UI buttons, physical buttons
        Triggers/                    #   Trigger zones, proximity events
      Systems/                       # World logic
        GameLogic/                   #   Scoring, rounds, win conditions
        Portals/                     #   Scene transitions, teleporters
        Mirrors/                     #   Mirror toggles, quality settings
        VideoPlayers/                #   Video player controls, playlists
        Stations/                    #   Sitting stations, vehicles
      Networking/                    #   Synced variables, ownership transfer
    Prefabs/                         # Reusable world objects
      Interactables/                 #   Pickups, buttons, doors
      Environment/                   #   Trees, rocks, furniture
      UI/                            #   World-space canvases, menus
    Materials/                       # World materials
    Textures/                        # World textures (keep ≤2048x2048)
    Audio/                           # Sound effects, ambient loops
    Animations/                      # Animator clips and controllers
    Lighting/                        # Baked lightmaps, light probes, reflection probes
    Environment/                     # Terrain data, skyboxes, weather
    UI/                              # UI sprites, fonts, canvas prefabs
    Scenes/
      WorldName.unity                # Main world scene
      WorldName_Testing.unity        # Test/debug scene (optional)
  Plugins/                           # Third-party (AudioLink, UdonToolkit, etc.)
  Packages/                          # VRChat SDK packages (managed by VCC)
```

**Key principles:**
- `_Project/` prefix ensures your content sorts above SDK folders in the Project window
- Scripts organized by *what they do* (interactions, systems, networking), not by *where they are in the scene*
- Lighting gets its own folder because baked data and probes are large and frequently regenerated

---

## Expected Structure (Avatar)

```
Assets/
  _AvatarName/                       # One folder per avatar
    FBX/                             # Base model files (.fbx, .blend imports)
    Materials/                       # Avatar materials
    Textures/                        # Avatar textures (keep ≤1024x1024 for mobile)
    Animations/                      # Gesture animations, idle overrides
    Controllers/                     # Animator controllers (FX, Gesture, Action, Sitting)
    Expressions/                     # VRC expression parameters + menus
    PhysBones/                       # PhysBone colliders, components
    Masks/                           # Avatar masks (upper body, left hand, etc.)
    Toggles/                         # Toggle/swap GameObjects (clothing, accessories)
    Fallback/                        # Fallback avatar configuration
```

**For multiple avatars:** Each avatar gets its own `_AvatarName/` folder. Shared materials or textures go in `_Shared/Materials/` at the same level.

**For work-in-progress:** Use `_AvatarName_WIP/` during development. Rename to `_AvatarName/` when publishing. Archive old versions in `_Archive/`.

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Udon scripts | PascalCase, system prefix | `Interaction_PickupSword.cs`, `System_ScoreManager.cs` |
| Synced variables | `_synced` prefix or clear sync annotation | `_syncedScore`, `_syncedOwnerID` |
| Animator parameters | PascalCase, match expression menu names | `IsFlying`, `EmoteIndex`, `ToggleHat` |
| Expression menus | PascalCase, descriptive | `Emotes`, `Toggles`, `Effects`, `Clothing` |
| Expression parameters | PascalCase, match menu items | `VRCEmote`, `Toggle_Wings` |
| PhysBone chains | Body part + descriptor | `Hair_Main`, `Tail_Primary`, `Ear_Left` |
| World prefabs | PascalCase with type prefix | `Pickup_Sword.prefab`, `Button_DoorOpen.prefab` |
| Avatar prefabs | Avatar name + variant | `Kitsune_Default.prefab`, `Kitsune_Quest.prefab` |
| Scenes | PascalCase, world/avatar name | `ForestWorld.unity`, `Kitsune_Upload.unity` |
| Materials | PascalCase, descriptive | `Body_Main.mat`, `Hair_Transparent.mat` |
| Textures | lowercase, object_channel | `body_albedo.png`, `hair_normal.png` |

---

## Red Flags

| Red Flag | Root Cause | Fix |
|----------|-----------|-----|
| UdonSharp scripts missing `[UdonBehaviourSyncMode]` | Sync behavior undefined | Add `[UdonBehaviourSyncMode(BehaviourSyncMode.Manual)]` or `NoVariableSync` to every script |
| Synced variables without clear ownership model | Network desync bugs | Document owner vs. non-owner behavior, use `Networking.IsOwner()` checks |
| Textures larger than 2048x2048 (world) or 1024x1024 (avatar) | Performance degradation | Resize textures, use crunch compression for non-critical assets |
| No `_Project/` prefix on content folder | Content mixed with SDK folders | Rename to `_Project/` or `_WorldName/` — underscore sorts first |
| Avatar exceeds Very Poor performance rank | Blocked on many instances | Reduce polygon count, material count, PhysBone chains per VRC limits |
| Expression menu has no submenus (all items flat) | Hard to navigate in VR | Group related toggles and emotes into submenus |
| No LOD groups on complex geometry | Frame drops in populated instances | Add LOD groups, especially on avatars with 70k+ polygons |
| PhysBone components on non-dynamic bones | Wasted performance budget | Only add PhysBones to bones that actually need physics (hair, tail, ears) |
| No fallback avatar configured | Shows gray robot to others on low settings | Set up a simple fallback under performance limits |
| Materials using non-VRC-compatible shaders | Broken rendering on some platforms | Use VRChat-compatible shaders (Standard, poiyomi, liltoon) |
| Multiple worlds/avatars in one Unity project with shared assets | Accidental cross-contamination | Keep separate `_ProjectName/` folders or use separate Unity projects |

---

## When to Reconsider

| Symptom | Likely Problem | Action |
|---------|---------------|--------|
| World has 30+ Udon scripts all in one folder | No system-based organization | Split into Interactions/, Systems/, Networking/ subfolders |
| Avatar has 50+ toggles | Flat expression menu, no categories | Group into submenus (Clothing, Accessories, Effects) |
| Multiple scenes in one project share scripts | Tight coupling between worlds | Extract shared scripts to a `_Shared/Scripts/` folder |
| SDK updates break your scripts | Scripts reference SDK internals | Use VRC API abstractions, avoid depending on internal SDK paths |
| Build size exceeds 500MB for a world | Uncompressed textures, unused assets | Audit texture sizes, remove unused prefabs, use asset bundles |
| Animator controllers have 20+ layers | Over-complex animation setup | Merge related layers, use sub-state machines |
