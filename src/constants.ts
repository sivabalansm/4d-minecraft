export const CHUNK_SIZE = 16;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export enum BlockType {
  AIR = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
  WATER = 4,
  WOOD = 5,
  LEAVES = 6,
  SAND = 7,
  PORTAL = 8,
}

export const BLOCK_COLORS: Record<BlockType, [number, number, number]> = {
  [BlockType.AIR]: [0, 0, 0],
  [BlockType.STONE]: [0.5, 0.5, 0.5],
  [BlockType.DIRT]: [0.545, 0.412, 0.078],
  [BlockType.GRASS]: [0.298, 0.686, 0.314],
  [BlockType.WATER]: [0.2, 0.4, 0.8],
  [BlockType.WOOD]: [0.55, 0.35, 0.15],
  [BlockType.LEAVES]: [0.18, 0.55, 0.18],
  [BlockType.SAND]: [0.85, 0.8, 0.55],
  [BlockType.PORTAL]: [0.6, 0.2, 0.9],
};

export const GRASS_SIDE_COLOR: [number, number, number] = [0.545, 0.412, 0.078];
export const GRASS_TOP_COLOR: [number, number, number] = [0.298, 0.686, 0.314];

export const BASE_HEIGHT = 32;
export const TERRAIN_AMPLITUDE = 16;
export const NOISE_SCALE = 0.02;
export const W_NOISE_SCALE = 0.05;
export const DIRT_DEPTH = 4;
export const CAVE_NOISE_SCALE = 0.05;
export const CAVE_THRESHOLD = 0.55;
export const WATER_LEVEL = 26;
export const TREE_DENSITY = 0.02;

export const TRANSPARENT_BLOCKS: Set<BlockType> = new Set([
  BlockType.AIR,
  BlockType.WATER,
  BlockType.LEAVES,
]);

export const SOLID_BLOCKS: Set<BlockType> = new Set([
  BlockType.STONE,
  BlockType.DIRT,
  BlockType.GRASS,
  BlockType.WOOD,
  BlockType.SAND,
  BlockType.PORTAL,
]);

export const FACE_DIRECTIONS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export const RENDER_DISTANCE = 6;
export const W_CACHE_RANGE = 2;
