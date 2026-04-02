export const CHUNK_SIZE = 16;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export enum BlockType {
  AIR = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
}

export const BLOCK_COLORS: Record<BlockType, [number, number, number]> = {
  [BlockType.AIR]: [0, 0, 0],
  [BlockType.STONE]: [0.5, 0.5, 0.5],
  [BlockType.DIRT]: [0.545, 0.412, 0.078],
  [BlockType.GRASS]: [0.298, 0.686, 0.314],
};

export const GRASS_SIDE_COLOR: [number, number, number] = [0.545, 0.412, 0.078];
export const GRASS_TOP_COLOR: [number, number, number] = [0.298, 0.686, 0.314];

export const BASE_HEIGHT = 32;
export const TERRAIN_AMPLITUDE = 16;
export const NOISE_SCALE = 0.02;
export const W_NOISE_SCALE = 0.05;
export const DIRT_DEPTH = 4;

export const FACE_DIRECTIONS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export const RENDER_DISTANCE = 4;
export const W_CACHE_RANGE = 2;
