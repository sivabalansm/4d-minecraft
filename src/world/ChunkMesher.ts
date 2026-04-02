import {
  BlockType,
  CHUNK_SIZE,
  BLOCK_COLORS,
  GRASS_TOP_COLOR,
  GRASS_SIDE_COLOR,
  FACE_DIRECTIONS,
} from '../constants';
import { Chunk } from './Chunk';

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
}

const FACE_VERTICES: Record<number, number[][]> = {
  0: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  1: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
  2: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
  3: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
  4: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
  5: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
};

const FACE_NORMALS: number[][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

type BlockGetter = (wx: number, wy: number, wz: number) => BlockType;

export function meshChunk(chunk: Chunk, getWorldBlock: BlockGetter): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;

  const worldX = chunk.cx * CHUNK_SIZE;
  const worldY = chunk.cy * CHUNK_SIZE;
  const worldZ = chunk.cz * CHUNK_SIZE;

  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const blockType = chunk.getBlock(x, y, z);
        if (blockType === BlockType.AIR) {
          continue;
        }

        for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
          const [dx, dy, dz] = FACE_DIRECTIONS[faceIndex];
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;

          const neighborType = nx >= 0 && nx < CHUNK_SIZE
            && ny >= 0 && ny < CHUNK_SIZE
            && nz >= 0 && nz < CHUNK_SIZE
            ? chunk.getBlock(nx, ny, nz)
            : getWorldBlock(worldX + nx, worldY + ny, worldZ + nz);

          if (neighborType !== BlockType.AIR) {
            continue;
          }

          const color: [number, number, number] = blockType === BlockType.GRASS
            ? faceIndex === 2
              ? GRASS_TOP_COLOR
              : faceIndex === 3
                ? BLOCK_COLORS[BlockType.DIRT]
                : GRASS_SIDE_COLOR
            : BLOCK_COLORS[blockType];

          const faceVertices = FACE_VERTICES[faceIndex];
          const faceNormal = FACE_NORMALS[faceIndex];

          for (const vertex of faceVertices) {
            positions.push(x + vertex[0], y + vertex[1], z + vertex[2]);
            normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
            colors.push(color[0], color[1], color[2]);
          }

          indices.push(
            vertexCount,
            vertexCount + 1,
            vertexCount + 2,
            vertexCount,
            vertexCount + 2,
            vertexCount + 3,
          );
          vertexCount += 4;
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    vertexCount,
    indexCount: indices.length,
  };
}
