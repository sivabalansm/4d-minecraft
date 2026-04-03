import { BASE_HEIGHT, BlockType } from '../constants';
import { World } from '../world/World';

const MINIMAP_WIDTH = 80;
const LAYER_HEIGHT = 40;
const LAYER_COUNT = 5;

export class WMinimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = MINIMAP_WIDTH;
    this.canvas.height = LAYER_HEIGHT * LAYER_COUNT;
    this.canvas.style.cssText =
      'position:fixed;top:50%;right:10px;transform:translateY(-50%);border:1px solid rgba(255,255,255,0.3);border-radius:4px;z-index:10;';
    document.body.appendChild(this.canvas);

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create minimap context');
    }

    this.ctx = context;
  }

  update(playerX: number, playerZ: number, currentW: number, world: World): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const pixelWidth = MINIMAP_WIDTH / 16;
    const pixelHeight = LAYER_HEIGHT / 16;
    const startX = Math.floor(playerX) - 8;
    const startZ = Math.floor(playerZ) - 8;
    const scanStartY = BASE_HEIGHT + 20;

    for (let dw = -2; dw <= 2; dw++) {
      const w = currentW + dw;
      const layerY = (dw + 2) * LAYER_HEIGHT;
      const isCurrentLayer = dw === 0;

      ctx.fillStyle = isCurrentLayer ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, layerY, MINIMAP_WIDTH, LAYER_HEIGHT);

      for (let dx = 0; dx < 16; dx++) {
        for (let dz = 0; dz < 16; dz++) {
          const wx = startX + dx;
          const wz = startZ + dz;
          let surfaceType = BlockType.AIR;

          for (let wy = scanStartY; wy >= 0; wy--) {
            const block = world.getBlockAtW(wx, wy, wz, w);
            if (block !== BlockType.AIR) {
              surfaceType = block;
              break;
            }
          }

          ctx.fillStyle = getMinimapColor(surfaceType);
          ctx.fillRect(dx * pixelWidth, layerY + dz * pixelHeight, pixelWidth, pixelHeight);
        }
      }

      ctx.fillStyle = isCurrentLayer ? '#fff' : 'rgba(255,255,255,0.6)';
      ctx.font = '9px monospace';
      ctx.fillText(`W:${w}`, 2, layerY + 10);

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(0, layerY, MINIMAP_WIDTH, LAYER_HEIGHT);
    }

    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(MINIMAP_WIDTH / 2, LAYER_HEIGHT * 2 + LAYER_HEIGHT / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getMinimapColor(type: BlockType): string {
  switch (type) {
    case BlockType.GRASS:
      return '#4CAF50';
    case BlockType.DIRT:
      return '#8B6914';
    case BlockType.STONE:
      return '#808080';
    case BlockType.WATER:
      return '#2266AA';
    case BlockType.SAND:
      return '#D4C088';
    case BlockType.WOOD:
      return '#8B5A2B';
    case BlockType.LEAVES:
      return '#1B7A1B';
    case BlockType.PORTAL:
      return '#7722CC';
    default:
      return 'rgba(0,0,0,0)';
  }
}
