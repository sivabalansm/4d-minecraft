import { createNoise4D } from 'simplex-noise';
import alea from 'alea';
import { Chunk } from './Chunk';
import {
  BlockType,
  CHUNK_SIZE,
  BASE_HEIGHT,
  TERRAIN_AMPLITUDE,
  NOISE_SCALE,
  W_NOISE_SCALE,
  DIRT_DEPTH,
} from '../constants';

export class WorldGen {
  private noise4D: (x: number, y: number, z: number, w: number) => number;

  constructor(seed: string) {
    const prng = alea(seed);
    this.noise4D = createNoise4D(prng);
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
            chunk.setBlock(x, y, z, BlockType.GRASS);
            depth = 0;
            continue;
          }

          depth += 1;
          if (depth <= DIRT_DEPTH) {
            chunk.setBlock(x, y, z, BlockType.DIRT);
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
}
