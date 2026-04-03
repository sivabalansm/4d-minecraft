import * as THREE from 'three';
import { BlockType } from '../constants';

const TILE_SIZE = 16;
export const ATLAS_TILES = 4;
const ATLAS_WIDTH = TILE_SIZE * ATLAS_TILES;
const ATLAS_HEIGHT = TILE_SIZE;

type TileSet = {
  top: number;
  bottom: number;
  side: number;
};

type TexturedBlockType = BlockType.STONE | BlockType.DIRT | BlockType.GRASS;

export const TILE_MAP: Record<TexturedBlockType, TileSet> = {
  [BlockType.STONE]: { top: 3, bottom: 3, side: 3 },
  [BlockType.DIRT]: { top: 2, bottom: 2, side: 2 },
  [BlockType.GRASS]: { top: 0, bottom: 2, side: 1 },
};

function getNoise(tileIndex: number, x: number, y: number): number {
  const value = Math.sin((tileIndex + 1) * 127.1 + x * 311.7 + y * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function fillTile(ctx: CanvasRenderingContext2D, tileIndex: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(tileIndex * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
}

function fillPixel(
  ctx: CanvasRenderingContext2D,
  tileIndex: number,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(tileIndex * TILE_SIZE + x, y, 1, 1);
}

function drawGrassTop(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#4CAF50');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (noise > 0.82) {
        fillPixel(ctx, tileIndex, x, y, '#2E7D32');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#66BB6A');
      }
    }
  }
}

function drawGrassSide(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#8B6914');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (y < 4) {
        const grassColor = noise > 0.7 ? '#388E3C' : noise < 0.15 ? '#66BB6A' : '#4CAF50';
        fillPixel(ctx, tileIndex, x, y, grassColor);
        continue;
      }

      if (noise > 0.84) {
        fillPixel(ctx, tileIndex, x, y, '#6D4C11');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#A67C2A');
      }
    }
  }
}

function drawDirt(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#8B6914');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (noise > 0.82) {
        fillPixel(ctx, tileIndex, x, y, '#6D4C11');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#A67C2A');
      } else if (noise > 0.44 && noise < 0.5) {
        fillPixel(ctx, tileIndex, x, y, '#7E7E7E');
      }
    }
  }
}

function drawStone(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#808080');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (noise > 0.86) {
        fillPixel(ctx, tileIndex, x, y, '#5F5F5F');
      } else if (noise < 0.1) {
        fillPixel(ctx, tileIndex, x, y, '#A8A8A8');
      }
    }
  }

  for (let x = 2; x < TILE_SIZE - 2; x += 5) {
    const y = 2 + ((x * 3) % (TILE_SIZE - 4));
    fillPixel(ctx, tileIndex, x, y, '#5A5A5A');
    fillPixel(ctx, tileIndex, x + 1, y, '#5A5A5A');

    if (y + 1 < TILE_SIZE) {
      fillPixel(ctx, tileIndex, x + 1, y + 1, '#6B6B6B');
    }

    if (x + 2 < TILE_SIZE && y > 0) {
      fillPixel(ctx, tileIndex, x + 2, y - 1, '#B5B5B5');
    }
  }

  for (let y = 4; y < TILE_SIZE - 2; y += 6) {
    const x = 1 + ((y * 5) % (TILE_SIZE - 3));
    fillPixel(ctx, tileIndex, x, y, '#616161');

    if (x + 1 < TILE_SIZE) {
      fillPixel(ctx, tileIndex, x + 1, y, '#616161');
    }

    if (x > 0 && y + 1 < TILE_SIZE) {
      fillPixel(ctx, tileIndex, x - 1, y + 1, '#B0B0B0');
    }
  }
}

export function getBlockFaceTileIndex(blockType: BlockType, faceIndex: number): number {
  if (blockType === BlockType.AIR) {
    return 0;
  }

  const tileSet = TILE_MAP[blockType];

  if (faceIndex === 2) {
    return tileSet.top;
  }

  if (faceIndex === 3) {
    return tileSet.bottom;
  }

  return tileSet.side;
}

export function createTextureAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create texture atlas context');
  }

  ctx.imageSmoothingEnabled = false;

  drawGrassTop(ctx, 0);
  drawGrassSide(ctx, 1);
  drawDirt(ctx, 2);
  drawStone(ctx, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}
