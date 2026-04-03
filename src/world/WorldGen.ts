import { createNoise3D, createNoise4D } from 'simplex-noise';
import alea from 'alea';
import { Chunk } from './Chunk';
import {
  BlockType,
  CHUNK_SIZE,
  BASE_HEIGHT,
  CAVE_NOISE_SCALE,
  CAVE_THRESHOLD,
  TERRAIN_AMPLITUDE,
  NOISE_SCALE,
  W_NOISE_SCALE,
  DIRT_DEPTH,
  SOLID_BLOCKS,
  TREE_DENSITY,
  WATER_LEVEL,
} from '../constants';

type Biome = 'normal' | 'forest' | 'desert' | 'ice' | 'mushroom' | 'crystal' | 'nether';

export class WorldGen {
  private noise3D: (x: number, y: number, z: number) => number;
  private noise4D: (x: number, y: number, z: number, w: number) => number;

  constructor(seed: string) {
    const prng = alea(seed);
    this.noise4D = createNoise4D(prng);
    this.noise3D = createNoise3D(prng);
  }

  generateChunk(cx: number, cy: number, cz: number, cw: number): Chunk {
    const chunk = new Chunk(cx, cy, cz, cw);
    const worldX = cx * CHUNK_SIZE;
    const worldY = cy * CHUNK_SIZE;
    const worldZ = cz * CHUNK_SIZE;
    const biome = this.getBiome(cw);
    const surfaceBlock = this.getSurfaceBlock(biome);
    const subsurfaceBlock = this.getSubsurfaceBlock(biome);
    const fluidBlock = this.getFluidBlock(biome);

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const wx = worldX + x;
          const wy = worldY + y;
          const wz = worldZ + z;
          const density = this.getDensity(wx, wy, wz, cw);

          if (density > 0) {
            chunk.setBlock(x, y, z, BlockType.STONE);
          }
        }
      }
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          if (chunk.getBlock(x, y, z) === BlockType.AIR) {
            continue;
          }

          const wx = worldX + x;
          const wy = worldY + y;
          const wz = worldZ + z;
          const caveNoise = this.noise3D(
            wx * CAVE_NOISE_SCALE,
            wy * CAVE_NOISE_SCALE,
            wz * CAVE_NOISE_SCALE,
          );
          const withinCaveRange = wy > 5 && wy < BASE_HEIGHT - 5;

          if (caveNoise > CAVE_THRESHOLD && withinCaveRange) {
            chunk.setBlock(x, y, z, BlockType.AIR);
            continue;
          }

          if (
            biome === 'crystal' &&
            withinCaveRange &&
            caveNoise > CAVE_THRESHOLD - 0.1 &&
            caveNoise <= CAVE_THRESHOLD
          ) {
            chunk.setBlock(x, y, z, BlockType.CRYSTAL);
          }
        }
      }
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        let depth = 0;

        for (let y = CHUNK_SIZE - 1; y >= 0; y--) {
          if (chunk.getBlock(x, y, z) === BlockType.AIR) {
            depth = 0;
            continue;
          }

          const blockAbove = y < CHUNK_SIZE - 1
            ? chunk.getBlock(x, y + 1, z)
            : this.getDensity(worldX + x, worldY + y + 1, worldZ + z, cw) > 0
              ? BlockType.STONE
              : BlockType.AIR;

          if (blockAbove === BlockType.AIR) {
            chunk.setBlock(x, y, z, surfaceBlock);
            depth = 0;
            continue;
          }

          depth += 1;
          if (depth <= DIRT_DEPTH) {
            chunk.setBlock(x, y, z, subsurfaceBlock);
            continue;
          }

          if (biome === 'nether') {
            chunk.setBlock(x, y, z, BlockType.OBSIDIAN);
          }

          if (Math.abs(cw) >= 5) {
            const wx = worldX + x;
            const wy = worldY + y;
            const wz = worldZ + z;
            const rareNoise = this.noise4D(
              wx * 0.03,
              wy * 0.03,
              wz * 0.03,
              cw * 0.1,
            );

            if (rareNoise > 0.92 && wy < BASE_HEIGHT - 12 && wy > 10) {
              chunk.setBlock(x, y, z, BlockType.PORTAL);
            }
          }
        }
      }
    }

    this.placeSurfaceStructures(chunk, biome, worldX, worldY, worldZ, cw);
    this.placeVegetation(chunk, biome, worldX, worldY, worldZ, cw);

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
          const wy = worldY + y;
          if (wy < WATER_LEVEL && chunk.getBlock(x, y, z) === BlockType.AIR) {
            chunk.setBlock(x, y, z, fluidBlock);
          }
        }
      }
    }

    this.placeDungeons(chunk, worldX, worldY, worldZ, cw);

    return chunk;
  }

  getDensity(wx: number, wy: number, wz: number, ww: number): number {
    const noiseValue = this.noise4D(
      wx * NOISE_SCALE,
      wy * NOISE_SCALE,
      wz * NOISE_SCALE,
      ww * W_NOISE_SCALE,
    );

    return -wy + BASE_HEIGHT + noiseValue * TERRAIN_AMPLITUDE;
  }

  private getBiome(cw: number): Biome {
    const absW = Math.abs(cw);

    if (absW === 0) {
      return 'normal';
    }

    if (absW === 1) {
      return 'forest';
    }

    if (cw === 2) {
      return 'desert';
    }

    if (cw === -2) {
      return 'ice';
    }

    if (cw === 3) {
      return 'mushroom';
    }

    if (cw === -3) {
      return 'crystal';
    }

    return 'nether';
  }

  private getSurfaceBlock(biome: Biome): BlockType {
    switch (biome) {
      case 'desert':
        return BlockType.SAND;
      case 'ice':
      case 'crystal':
        return BlockType.SNOW;
      case 'mushroom':
        return BlockType.MUSHROOM_CAP;
      case 'nether':
        return BlockType.OBSIDIAN;
      default:
        return BlockType.GRASS;
    }
  }

  private getSubsurfaceBlock(biome: Biome): BlockType {
    switch (biome) {
      case 'desert':
        return BlockType.SAND;
      case 'ice':
        return BlockType.ICE;
      case 'nether':
        return BlockType.OBSIDIAN;
      default:
        return BlockType.DIRT;
    }
  }

  private getFluidBlock(biome: Biome): BlockType {
    switch (biome) {
      case 'ice':
        return BlockType.ICE;
      case 'nether':
        return BlockType.LAVA;
      default:
        return BlockType.WATER;
    }
  }

  private hashPosition(x: number, z: number, w: number, salt = 0): number {
    let h = (x * 374761393 + z * 668265263 + w * 2147483647 + salt * 1597334677) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return (h & 0x7fffffff) / 0x7fffffff;
  }

  private findSurfaceY(chunk: Chunk, x: number, z: number): number {
    for (let y = CHUNK_SIZE - 2; y >= 0; y--) {
      const block = chunk.getBlock(x, y, z);
      if (block !== BlockType.AIR && chunk.getBlock(x, y + 1, z) === BlockType.AIR) {
        return y;
      }
    }

    return -1;
  }

  private isFlatArea(chunk: Chunk, centerX: number, centerY: number, centerZ: number, radius: number): boolean {
    if (
      centerX - radius < 0 ||
      centerX + radius >= CHUNK_SIZE ||
      centerZ - radius < 0 ||
      centerZ + radius >= CHUNK_SIZE
    ) {
      return false;
    }

    let minY = centerY;
    let maxY = centerY;

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        let surfaceY = -1;

        for (let offset = -1; offset <= 1; offset++) {
          const candidateY = centerY + offset;
          if (candidateY < 0 || candidateY >= CHUNK_SIZE - 1) {
            continue;
          }

          const block = chunk.getBlock(centerX + dx, candidateY, centerZ + dz);
          const blockAbove = chunk.getBlock(centerX + dx, candidateY + 1, centerZ + dz);
          if (block !== BlockType.AIR && blockAbove === BlockType.AIR) {
            surfaceY = candidateY;
            break;
          }
        }

        if (surfaceY === -1) {
          return false;
        }

        minY = Math.min(minY, surfaceY);
        maxY = Math.max(maxY, surfaceY);

        if (maxY - minY > 1) {
          return false;
        }
      }
    }

    return true;
  }

  private placeSurfaceStructures(
    chunk: Chunk,
    biome: Biome,
    worldX: number,
    worldY: number,
    worldZ: number,
    worldW: number,
  ): void {
    const supportsVillage = biome === 'normal' || biome === 'forest';
    const supportsTower = biome === 'crystal';

    if (!supportsVillage && !supportsTower) {
      return;
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const surfaceY = this.findSurfaceY(chunk, x, z);
        if (surfaceY === -1) {
          continue;
        }

        const blockType = chunk.getBlock(x, surfaceY, z);
        const wx = worldX + x;
        const wy = worldY + surfaceY;
        const wz = worldZ + z;

        if (wy < WATER_LEVEL) {
          continue;
        }

        if (supportsVillage && blockType === BlockType.GRASS) {
          const villageHash = this.hashPosition(wx, wz, worldW, 7);
          if (villageHash < 0.003) {
            this.placeVillageHut(chunk, x, surfaceY, z);
          }
        }

        if (supportsTower && blockType === BlockType.SNOW) {
          const towerHash = this.hashPosition(wx, wz, worldW, 13);
          if (towerHash < 0.01) {
            this.placeCrystalTower(chunk, x, surfaceY, z, wx, wz, worldW);
          }
        }
      }
    }
  }

  private placeVegetation(
    chunk: Chunk,
    biome: Biome,
    worldX: number,
    worldY: number,
    worldZ: number,
    worldW: number,
  ): void {
    if (biome !== 'normal' && biome !== 'forest' && biome !== 'mushroom') {
      return;
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const surfaceY = this.findSurfaceY(chunk, x, z);
        if (surfaceY === -1) {
          continue;
        }

        const wx = worldX + x;
        const wy = worldY + surfaceY;
        const wz = worldZ + z;
        const blockType = chunk.getBlock(x, surfaceY, z);

        if (biome === 'mushroom') {
          if (blockType !== BlockType.MUSHROOM_CAP) {
            continue;
          }

          if (!this.canPlacePlant(chunk, x, surfaceY, z, wx, wy, wz, worldW, BlockType.MUSHROOM_CAP, 8)) {
            continue;
          }

          if (this.hashPosition(wx, wz, worldW, 42) >= TREE_DENSITY) {
            continue;
          }

          this.placeMushroom(chunk, x, surfaceY, z, wx, wz, worldW);
          continue;
        }

        if (blockType !== BlockType.GRASS) {
          continue;
        }

        const isForest = biome === 'forest';
        const treeDensity = isForest ? 0.05 : TREE_DENSITY;
        const treeHeight = isForest ? 8 : 6;

        if (!this.canPlacePlant(chunk, x, surfaceY, z, wx, wy, wz, worldW, BlockType.GRASS, treeHeight)) {
          continue;
        }

        if (this.hashPosition(wx, wz, worldW, isForest ? 3 : 0) >= treeDensity) {
          continue;
        }

        this.placeTree(chunk, x, surfaceY, z, isForest);
      }
    }
  }

  private canPlacePlant(
    chunk: Chunk,
    lx: number,
    ly: number,
    lz: number,
    wx: number,
    wy: number,
    wz: number,
    ww: number,
    requiredGround: BlockType,
    height: number,
  ): boolean {
    if (chunk.getBlock(lx, ly, lz) !== requiredGround) {
      return false;
    }

    if (this.getDensity(wx, wy + height, wz, ww) > 0) {
      return false;
    }

    for (let trunkY = ly + 1; trunkY <= ly + height; trunkY++) {
      const blockAbove = chunk.getBlock(lx, trunkY, lz);

      if (
        blockAbove !== BlockType.AIR &&
        blockAbove !== BlockType.LEAVES &&
        blockAbove !== BlockType.MUSHROOM_CAP
      ) {
        return false;
      }
    }

    return true;
  }

  private placeTree(chunk: Chunk, lx: number, ly: number, lz: number, tall = false): void {
    const trunkHeight = tall ? 6 : 4;

    for (let trunkOffset = 1; trunkOffset <= trunkHeight; trunkOffset++) {
      chunk.setBlock(lx, ly + trunkOffset, lz, BlockType.WOOD);
    }

    this.placeLeafLayer(chunk, lx, ly + trunkHeight, lz, 2);
    this.placeLeafLayer(chunk, lx, ly + trunkHeight + 1, lz, tall ? 2 : 1);

    if (tall) {
      this.placeLeafLayer(chunk, lx, ly + trunkHeight + 2, lz, 1);
    }

    const topY = ly + trunkHeight + (tall ? 3 : 2);
    if (!SOLID_BLOCKS.has(chunk.getBlock(lx, topY, lz))) {
      chunk.setBlock(lx, topY, lz, BlockType.LEAVES);
    }
  }

  private placeMushroom(
    chunk: Chunk,
    lx: number,
    ly: number,
    lz: number,
    wx: number,
    wz: number,
    ww: number,
  ): void {
    if (lx - 3 < 0 || lx + 3 >= CHUNK_SIZE || lz - 3 < 0 || lz + 3 >= CHUNK_SIZE || ly + 8 >= CHUNK_SIZE) {
      return;
    }

    const height = 5 + Math.floor(this.hashPosition(wx, wz, ww, 42) * 3);

    for (let stemY = 1; stemY <= height; stemY++) {
      chunk.setBlock(lx, ly + stemY, lz, BlockType.MUSHROOM_STEM);
    }

    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > 4) {
          continue;
        }

        const capX = lx + dx;
        const capZ = lz + dz;
        chunk.setBlock(capX, ly + height, capZ, BlockType.MUSHROOM_CAP);
        chunk.setBlock(capX, ly + height + 1, capZ, BlockType.MUSHROOM_CAP);
      }
    }
  }

  private placeVillageHut(chunk: Chunk, lx: number, ly: number, lz: number): void {
    if (lx - 2 < 0 || lx + 2 >= CHUNK_SIZE || lz - 2 < 0 || lz + 2 >= CHUNK_SIZE || ly + 4 >= CHUNK_SIZE) {
      return;
    }

    if (!this.isFlatArea(chunk, lx, ly, lz, 2)) {
      return;
    }

    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        chunk.setBlock(lx + dx, ly + 1, lz + dz, BlockType.WOOD);
        chunk.setBlock(lx + dx, ly + 4, lz + dz, BlockType.WOOD);
      }
    }

    for (let wallY = ly + 1; wallY <= ly + 3; wallY++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const isPerimeter = Math.abs(dx) === 1 || Math.abs(dz) === 1;
          const isDoorway = dx === 0 && dz === -1 && wallY <= ly + 2;

          if (!isPerimeter || isDoorway) {
            continue;
          }

          chunk.setBlock(lx + dx, wallY, lz + dz, BlockType.WOOD);
        }
      }
    }
  }

  private placeCrystalTower(
    chunk: Chunk,
    lx: number,
    ly: number,
    lz: number,
    wx: number,
    wz: number,
    ww: number,
  ): void {
    const height = 8 + Math.floor(this.hashPosition(wx, wz, ww, 19) * 5);

    if (lx - 1 < 0 || lx + 1 >= CHUNK_SIZE || lz - 1 < 0 || lz + 1 >= CHUNK_SIZE || ly + height + 1 >= CHUNK_SIZE) {
      return;
    }

    for (let towerY = 1; towerY <= height; towerY++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          chunk.setBlock(lx + dx, ly + towerY, lz + dz, BlockType.CRYSTAL);
        }
      }
    }

    chunk.setBlock(lx, ly + height + 1, lz, BlockType.CRYSTAL);
  }

  private placeDungeons(
    chunk: Chunk,
    worldX: number,
    worldY: number,
    worldZ: number,
    worldW: number,
  ): void {
    for (let z = 2; z < CHUNK_SIZE - 2; z++) {
      for (let y = 1; y < CHUNK_SIZE - 2; y++) {
        for (let x = 2; x < CHUNK_SIZE - 2; x++) {
          const wx = worldX + x;
          const wy = worldY + y;
          const wz = worldZ + z;
          const caveNoise = this.noise3D(
            wx * CAVE_NOISE_SCALE,
            wy * CAVE_NOISE_SCALE,
            wz * CAVE_NOISE_SCALE,
          );
          const blockAtCenter = chunk.getBlock(x, y, z);

          if (caveNoise <= CAVE_THRESHOLD) {
            continue;
          }

          if (SOLID_BLOCKS.has(blockAtCenter)) {
            continue;
          }

          if (this.hashPosition(wx + wy * 17, wz, worldW, 23) >= 0.001) {
            continue;
          }

          this.placeDungeon(chunk, x, y, z);
          return;
        }
      }
    }
  }

  private placeDungeon(chunk: Chunk, lx: number, ly: number, lz: number): void {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        chunk.setBlock(lx + dx, ly, lz + dz, BlockType.OBSIDIAN);
      }
    }

    for (let wallY = ly + 1; wallY <= ly + 2; wallY++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          chunk.setBlock(
            lx + dx,
            wallY,
            lz + dz,
            isWall ? BlockType.OBSIDIAN : BlockType.AIR,
          );
        }
      }
    }

    chunk.setBlock(lx, ly, lz, BlockType.PORTAL);
  }

  private placeLeafLayer(chunk: Chunk, centerX: number, y: number, centerZ: number, radius: number): void {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.abs(dx) + Math.abs(dz);

        if (distance > radius + 1) {
          continue;
        }

        const leafX = centerX + dx;
        const leafZ = centerZ + dz;
        const currentBlock = chunk.getBlock(leafX, y, leafZ);

        if (SOLID_BLOCKS.has(currentBlock)) {
          continue;
        }

        chunk.setBlock(leafX, y, leafZ, BlockType.LEAVES);
      }
    }
  }
}
