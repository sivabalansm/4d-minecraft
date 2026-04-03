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

          if (caveNoise > CAVE_THRESHOLD && wy > 5 && wy < BASE_HEIGHT - 5) {
            chunk.setBlock(x, y, z, BlockType.AIR);
          }
        }
      }
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        let depth = 0;
        const isDesertLayer = Math.abs(cw) >= 2;

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
            chunk.setBlock(x, y, z, isDesertLayer ? BlockType.SAND : BlockType.GRASS);
            depth = 0;
            continue;
          }

          depth += 1;
          if (depth <= DIRT_DEPTH) {
            chunk.setBlock(x, y, z, isDesertLayer ? BlockType.SAND : BlockType.DIRT);
            continue;
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

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const wx = worldX + x;
          const wy = worldY + y;
          const wz = worldZ + z;
          const blockType = chunk.getBlock(x, y, z);

          if (blockType !== BlockType.GRASS || !this.canPlaceTree(chunk, x, y, z, wx, wy, wz, cw)) {
            continue;
          }

          const treeHash = this.hashPosition(wx, wz, cw);
          if (treeHash >= TREE_DENSITY) {
            continue;
          }

          this.placeTree(chunk, x, y, z);
        }
      }
    }

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
          const wy = worldY + y;
          if (wy < WATER_LEVEL && chunk.getBlock(x, y, z) === BlockType.AIR) {
            chunk.setBlock(x, y, z, BlockType.WATER);
          }
        }
      }
    }

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

  private hashPosition(x: number, z: number, w: number): number {
    let h = (x * 374761393 + z * 668265263 + w * 2147483647) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return (h & 0x7fffffff) / 0x7fffffff;
  }

  private canPlaceTree(
    chunk: Chunk,
    lx: number,
    ly: number,
    lz: number,
    wx: number,
    wy: number,
    wz: number,
    ww: number,
  ): boolean {
    if (chunk.getBlock(lx, ly, lz) !== BlockType.GRASS) {
      return false;
    }

    if (this.getDensity(wx, wy + 6, wz, ww) > 0) {
      return false;
    }

    for (let trunkY = ly + 1; trunkY <= ly + 4; trunkY++) {
      const blockAbove = chunk.getBlock(lx, trunkY, lz);

      if (blockAbove !== BlockType.AIR && blockAbove !== BlockType.LEAVES) {
        return false;
      }
    }

    return true;
  }

  private placeTree(chunk: Chunk, lx: number, ly: number, lz: number): void {
    for (let trunkOffset = 1; trunkOffset <= 4; trunkOffset++) {
      chunk.setBlock(lx, ly + trunkOffset, lz, BlockType.WOOD);
    }

    this.placeLeafLayer(chunk, lx, ly + 4, lz, 2);
    this.placeLeafLayer(chunk, lx, ly + 5, lz, 1);

    if (!SOLID_BLOCKS.has(chunk.getBlock(lx, ly + 6, lz))) {
      chunk.setBlock(lx, ly + 6, lz, BlockType.LEAVES);
    }
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
