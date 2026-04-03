import {
  BlockType,
  CHUNK_SIZE,
  FACE_DIRECTIONS,
} from '../constants';
import { ATLAS_TILES, getBlockFaceTileIndex } from '../rendering/TextureAtlas';
import { Chunk } from './Chunk';

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  uvs: Float32Array;
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

const AO_FACTORS = [1, 0.75, 0.5, 0.35] as const;
const FACE_UVS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

type NeighborOffset = [number, number, number];
type VertexAoOffsets = [NeighborOffset, NeighborOffset, NeighborOffset];
type FaceAoOffsets = [VertexAoOffsets, VertexAoOffsets, VertexAoOffsets, VertexAoOffsets];

const FACE_AO_OFFSETS: Record<number, FaceAoOffsets> = {
  0: [
    [[1, -1, 0], [1, 0, -1], [1, -1, -1]],
    [[1, 1, 0], [1, 0, -1], [1, 1, -1]],
    [[1, 1, 0], [1, 0, 1], [1, 1, 1]],
    [[1, -1, 0], [1, 0, 1], [1, -1, 1]],
  ],
  1: [
    [[-1, -1, 0], [-1, 0, 1], [-1, -1, 1]],
    [[-1, 1, 0], [-1, 0, 1], [-1, 1, 1]],
    [[-1, 1, 0], [-1, 0, -1], [-1, 1, -1]],
    [[-1, -1, 0], [-1, 0, -1], [-1, -1, -1]],
  ],
  2: [
    [[-1, 1, 0], [0, 1, -1], [-1, 1, -1]],
    [[-1, 1, 0], [0, 1, 1], [-1, 1, 1]],
    [[1, 1, 0], [0, 1, 1], [1, 1, 1]],
    [[1, 1, 0], [0, 1, -1], [1, 1, -1]],
  ],
  3: [
    [[-1, -1, 0], [0, -1, 1], [-1, -1, 1]],
    [[-1, -1, 0], [0, -1, -1], [-1, -1, -1]],
    [[1, -1, 0], [0, -1, -1], [1, -1, -1]],
    [[1, -1, 0], [0, -1, 1], [1, -1, 1]],
  ],
  4: [
    [[-1, 0, 1], [0, -1, 1], [-1, -1, 1]],
    [[1, 0, 1], [0, -1, 1], [1, -1, 1]],
    [[1, 0, 1], [0, 1, 1], [1, 1, 1]],
    [[-1, 0, 1], [0, 1, 1], [-1, 1, 1]],
  ],
  5: [
    [[1, 0, -1], [0, -1, -1], [1, -1, -1]],
    [[-1, 0, -1], [0, -1, -1], [-1, -1, -1]],
    [[-1, 0, -1], [0, 1, -1], [-1, 1, -1]],
    [[1, 0, -1], [0, 1, -1], [1, 1, -1]],
  ],
};

type BlockGetter = (wx: number, wy: number, wz: number) => BlockType;

export function meshChunk(chunk: Chunk, getWorldBlock: BlockGetter): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;

  const worldX = chunk.cx * CHUNK_SIZE;
  const worldY = chunk.cy * CHUNK_SIZE;
  const worldZ = chunk.cz * CHUNK_SIZE;

  const getBlock = (x: number, y: number, z: number): BlockType => {
    if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
      return chunk.getBlock(x, y, z);
    }

    return getWorldBlock(worldX + x, worldY + y, worldZ + z);
  };

  const isSolidBlock = (x: number, y: number, z: number): boolean => getBlock(x, y, z) !== BlockType.AIR;

  const getVertexAo = (x: number, y: number, z: number, offsets: VertexAoOffsets): number => {
    const [side1Offset, side2Offset, cornerOffset] = offsets;
    const side1 = isSolidBlock(x + side1Offset[0], y + side1Offset[1], z + side1Offset[2]) ? 1 : 0;
    const side2 = isSolidBlock(x + side2Offset[0], y + side2Offset[1], z + side2Offset[2]) ? 1 : 0;

    if (side1 === 1 && side2 === 1) {
      return 3;
    }

    const corner = isSolidBlock(x + cornerOffset[0], y + cornerOffset[1], z + cornerOffset[2]) ? 1 : 0;
    return 3 - (side1 + side2 + corner);
  };

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

          const neighborType = getBlock(nx, ny, nz);

          if (neighborType !== BlockType.AIR) {
            continue;
          }

          const faceVertices = FACE_VERTICES[faceIndex];
          const faceNormal = FACE_NORMALS[faceIndex];
          const faceAoOffsets = FACE_AO_OFFSETS[faceIndex];
          const aoValues = faceAoOffsets.map((offsets) => getVertexAo(x, y, z, offsets));
          const tileIndex = getBlockFaceTileIndex(blockType, faceIndex);
          const tileSize = 1 / ATLAS_TILES;
          const uMin = tileIndex * tileSize;
          const uMax = uMin + tileSize;
          const faceUvs: [number, number][] = [
            [uMin, 0],
            [uMin, 1],
            [uMax, 1],
            [uMax, 0],
          ];

          for (let vertexIndex = 0; vertexIndex < faceVertices.length; vertexIndex++) {
            const vertex = faceVertices[vertexIndex];
            const [u, v] = faceUvs[vertexIndex] ?? FACE_UVS[vertexIndex];
            const aoFactor = AO_FACTORS[aoValues[vertexIndex]];

            positions.push(x + vertex[0], y + vertex[1], z + vertex[2]);
            normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
            colors.push(aoFactor, aoFactor, aoFactor);
            uvs.push(u, v);
          }

          const shouldFlip = aoValues[0] + aoValues[2] > aoValues[1] + aoValues[3];

          if (shouldFlip) {
            indices.push(
              vertexCount + 1,
              vertexCount + 2,
              vertexCount + 3,
              vertexCount + 1,
              vertexCount + 3,
              vertexCount,
            );
          } else {
            indices.push(
              vertexCount,
              vertexCount + 1,
              vertexCount + 2,
              vertexCount,
              vertexCount + 2,
              vertexCount + 3,
            );
          }

          vertexCount += 4;
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    vertexCount,
    indexCount: indices.length,
  };
}
