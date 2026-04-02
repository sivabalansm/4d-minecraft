import { CHUNK_SIZE, CHUNK_VOLUME, BlockType } from '../constants';

export class Chunk {
  public readonly cx: number;
  public readonly cy: number;
  public readonly cz: number;
  public readonly cw: number;
  public readonly data: Uint8Array;

  constructor(cx: number, cy: number, cz: number, cw: number) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.cw = cw;
    this.data = new Uint8Array(CHUNK_VOLUME);
  }

  private index(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
      return BlockType.AIR;
    }

    return this.data[this.index(x, y, z)] as BlockType;
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
      return;
    }

    this.data[this.index(x, y, z)] = type;
  }

  fill(type: BlockType): void {
    this.data.fill(type);
  }

  isEmpty(): boolean {
    return this.data.every((block) => block === BlockType.AIR);
  }
}
