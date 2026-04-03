# 4D Minecraft

A browser-based Minecraft clone where the world exists in **4 spatial dimensions**. Navigate familiar voxel terrain, then press Q/E to shift along the W-axis and discover entirely different worlds — ice biomes, mushroom forests, crystal caves, and nether wastelands — all generated from the same 4D noise field.

**[Play it live](https://4d-eight.vercel.app)**

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look |
| Space | Jump |
| Shift | Descend |
| Ctrl / Double-tap W | Sprint |
| Q / E | Shift W-dimension |
| Left Click | Destroy block |
| Right Click | Place block |
| 1-0 | Select block type |
| G | Toggle ghost vision (see adjacent W-layers) |

## The 4th Dimension

The world is a 4D grid of voxels indexed by (X, Y, Z, **W**). You see a 3D cross-section at your current W-coordinate. Pressing Q or E steps you to the adjacent W-layer, where terrain is similar but subtly different — hills shift, caves appear or vanish, and entirely new biomes emerge at higher |W| values.

### W-Layer Biomes

| W | Biome | Description |
|---|-------|-------------|
| 0 | Grassland | Oak trees, village huts, green rolling hills |
| ±1 | Forest | Dense tall trees, firefly mobs |
| 2 | Desert | Sand dunes, sparse vegetation |
| -2 | Ice | Snow surface, frozen water, ghost mobs |
| 3 | Mushroom | Giant mushroom structures, red cap terrain |
| -3 | Crystal | Crystal cave walls, crystal towers, snow surface |
| ±4+ | Nether | Obsidian surface, lava pools, dungeons with portals |

## Features

- **4D procedural terrain** via height-biased simplex noise across all 4 axes
- **7 unique biomes** tied to the W-dimension
- **16 block types** with procedural pixel-art textures
- **Greedy meshing** with ambient occlusion and quad flipping
- **4 mob types**: slimes, spiders, ghosts, and fireflies with biome-based spawning
- **3 structures**: village huts, crystal towers, underground dungeons
- **Block interaction**: destroy and place with raycasting (DDA algorithm)
- **Procedural audio**: all sounds generated via Web Audio API (no assets)
- **W-axis ghosting**: toggle transparent overlays of adjacent dimensions
- **W-axis minimap**: top-down view of 5 W-layers
- **4D portals**: step on portal blocks to teleport across dimensions
- **Sprinting** with FOV lerp
- **Water** with transparent rendering
- **Drifting clouds**
- **Chunk streaming** with throttled loading for smooth exploration

## Tech Stack

- **Three.js** — WebGL rendering
- **TypeScript** — type safety
- **Vite** — build tool
- **simplex-noise** — 4D coherent noise generation
- **Web Audio API** — procedural sound effects
- **Canvas2D** — procedural texture atlas generation

Zero external assets. Everything is generated at runtime.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # production build → dist/
```

## Architecture

```
src/
├── main.ts                 # Game loop, physics, HUD, wiring
├── constants.ts            # Block types, world params, biome config
├── audio/
│   └── SoundManager.ts     # Procedural Web Audio sounds
├── entities/
│   └── Mob.ts              # 4 mob types with distinct AI
├── player/
│   ├── Player.ts           # Position, velocity, dimensions
│   └── Controls.ts         # Input handling, pointer lock
├── rendering/
│   └── TextureAtlas.ts     # 16-tile procedural pixel-art atlas
├── ui/
│   └── WMinimap.ts         # W-axis top-down minimap
└── world/
    ├── Chunk.ts            # 16³ voxel storage (Uint8Array)
    ├── ChunkMesher.ts      # Greedy meshing with AO
    ├── VoxelRaycast.ts     # DDA ray-voxel intersection
    ├── World.ts            # 4D chunk management, mesh lifecycle
    └── WorldGen.ts         # 4D terrain, caves, trees, structures, biomes
```
