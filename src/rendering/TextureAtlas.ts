import * as THREE from 'three';
import { BlockType } from '../constants';

const TILE_SIZE = 16;
export const ATLAS_TILES = 16;
const ATLAS_WIDTH = TILE_SIZE * ATLAS_TILES;
const ATLAS_HEIGHT = TILE_SIZE;

type TileSet = {
  top: number;
  bottom: number;
  side: number;
};

type TexturedBlockType =
  | BlockType.STONE
  | BlockType.DIRT
  | BlockType.GRASS
  | BlockType.WATER
  | BlockType.WOOD
  | BlockType.LEAVES
  | BlockType.SAND
  | BlockType.PORTAL
  | BlockType.ICE
  | BlockType.MUSHROOM_STEM
  | BlockType.MUSHROOM_CAP
  | BlockType.CRYSTAL
  | BlockType.OBSIDIAN
  | BlockType.LAVA
  | BlockType.SNOW;

export const TILE_MAP: Record<TexturedBlockType, TileSet> = {
  [BlockType.STONE]: { top: 3, bottom: 3, side: 3 },
  [BlockType.DIRT]: { top: 2, bottom: 2, side: 2 },
  [BlockType.GRASS]: { top: 0, bottom: 2, side: 1 },
  [BlockType.WATER]: { top: 4, bottom: 4, side: 4 },
  [BlockType.WOOD]: { top: 5, bottom: 5, side: 5 },
  [BlockType.LEAVES]: { top: 6, bottom: 6, side: 6 },
  [BlockType.SAND]: { top: 7, bottom: 7, side: 7 },
  [BlockType.PORTAL]: { top: 8, bottom: 8, side: 8 },
  [BlockType.ICE]: { top: 9, bottom: 9, side: 9 },
  [BlockType.MUSHROOM_STEM]: { top: 10, bottom: 10, side: 10 },
  [BlockType.MUSHROOM_CAP]: { top: 11, bottom: 11, side: 11 },
  [BlockType.CRYSTAL]: { top: 12, bottom: 12, side: 12 },
  [BlockType.OBSIDIAN]: { top: 13, bottom: 13, side: 13 },
  [BlockType.LAVA]: { top: 14, bottom: 14, side: 14 },
  [BlockType.SNOW]: { top: 15, bottom: 15, side: 15 },
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

function drawWater(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#2266AA');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);
      const ripple = (x + y * 2) % 6;

      if ((ripple === 0 || ripple === 1) && noise > 0.35) {
        fillPixel(ctx, tileIndex, x, y, '#4488CC');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#19558F');
      }
    }
  }
}

function drawWood(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#8B5A2B');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (x % 4 === 0 || (x + y) % 9 === 0) {
        fillPixel(ctx, tileIndex, x, y, '#6B3A1B');
      } else if (noise < 0.1) {
        fillPixel(ctx, tileIndex, x, y, '#9C6A39');
      }
    }
  }
}

function drawLeaves(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#1B7A1B');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (noise > 0.82) {
        fillPixel(ctx, tileIndex, x, y, '#39A839');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#145C14');
      } else if (noise > 0.44 && noise < 0.5) {
        fillPixel(ctx, tileIndex, x, y, '#255F25');
      }
    }
  }
}

function drawSand(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#D4C088');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (noise > 0.84) {
        fillPixel(ctx, tileIndex, x, y, '#E3D2A0');
      } else if (noise < 0.1) {
        fillPixel(ctx, tileIndex, x, y, '#BFA56D');
      }
    }
  }
}

function drawPortal(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#7722CC');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const centeredX = x - TILE_SIZE / 2 + 0.5;
      const centeredY = y - TILE_SIZE / 2 + 0.5;
      const distance = Math.sqrt(centeredX * centeredX + centeredY * centeredY);
      const swirl = Math.sin(distance * 1.8 + Math.atan2(centeredY, centeredX) * 3);
      const noise = getNoise(tileIndex, x, y);

      if (swirl > 0.45 && noise > 0.3) {
        fillPixel(ctx, tileIndex, x, y, '#CC44FF');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#5E19A3');
      }
    }
  }
}

function drawIce(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#B0D4F1');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);
      const streak = (x + y * 2) % 7;

      if (streak === 0 || (Math.abs(x - y) % 6 === 0 && noise > 0.3)) {
        fillPixel(ctx, tileIndex, x, y, '#EEF7FF');
      } else if (noise < 0.1) {
        fillPixel(ctx, tileIndex, x, y, '#9EC5E8');
      } else if (noise > 0.88) {
        fillPixel(ctx, tileIndex, x, y, '#D9ECFA');
      }
    }
  }
}

function drawMushroomStem(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#D9D0C0');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (x % 4 === 1 || (x + y) % 11 === 0) {
        fillPixel(ctx, tileIndex, x, y, '#BFB19E');
      } else if (noise > 0.86) {
        fillPixel(ctx, tileIndex, x, y, '#EEE4D4');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#CBBEAB');
      }
    }
  }
}

function drawMushroomCap(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#CC2222');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (noise > 0.86 && (x + y) % 3 !== 0) {
        fillPixel(ctx, tileIndex, x, y, '#FFF6F1');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#A81818');
      } else if ((x * y) % 13 === 0) {
        fillPixel(ctx, tileIndex, x, y, '#D93D3D');
      }
    }
  }
}

function drawCrystal(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#33DDDD');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);
      const shard = (x + y) % 5 === 0 || Math.abs(x - y) % 7 === 0;

      if (shard && noise > 0.24) {
        fillPixel(ctx, tileIndex, x, y, '#F2FFFF');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#1DAFB7');
      } else if (noise > 0.9) {
        fillPixel(ctx, tileIndex, x, y, '#8AF6F6');
      }
    }
  }
}

function drawObsidian(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#1A0F2E');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if ((x + y * 3) % 9 === 0 && noise > 0.35) {
        fillPixel(ctx, tileIndex, x, y, '#40215F');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#120A20');
      } else if (noise > 0.9) {
        fillPixel(ctx, tileIndex, x, y, '#2D1745');
      }
    }
  }
}

function drawLava(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#FF4400');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);
      const flow = (x * 2 + y) % 6;

      if ((flow === 0 || flow === 1) && noise > 0.25) {
        fillPixel(ctx, tileIndex, x, y, '#FFAA00');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#7A1F00');
      } else if (noise > 0.9) {
        fillPixel(ctx, tileIndex, x, y, '#FF6B1A');
      }
    }
  }
}

function drawSnow(ctx: CanvasRenderingContext2D, tileIndex: number): void {
  fillTile(ctx, tileIndex, '#F0F0F5');

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = getNoise(tileIndex, x, y);

      if (noise > 0.88) {
        fillPixel(ctx, tileIndex, x, y, '#FFFFFF');
      } else if (noise < 0.08) {
        fillPixel(ctx, tileIndex, x, y, '#D8E4F5');
      }
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
  drawWater(ctx, 4);
  drawWood(ctx, 5);
  drawLeaves(ctx, 6);
  drawSand(ctx, 7);
  drawPortal(ctx, 8);
  drawIce(ctx, 9);
  drawMushroomStem(ctx, 10);
  drawMushroomCap(ctx, 11);
  drawCrystal(ctx, 12);
  drawObsidian(ctx, 13);
  drawLava(ctx, 14);
  drawSnow(ctx, 15);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}
