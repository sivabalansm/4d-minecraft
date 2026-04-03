import {
  BlockType,
  CHUNK_SIZE,
  FACE_DIRECTIONS,
  TRANSPARENT_BLOCKS,
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

const AO_FACTORS = [1, 0.75, 0.5, 0.35] as const;

type NeighborOffset = [number, number, number];
type VertexAoOffsets = [NeighborOffset, NeighborOffset, NeighborOffset];
type FaceAoOffsets = [VertexAoOffsets, VertexAoOffsets, VertexAoOffsets, VertexAoOffsets];

interface FaceDescriptor {
  blockType: BlockType;
  tileIndex: number;
  aoValues: [number, number, number, number];
  aoUniformValue: number | null;
  x: number;
  y: number;
  z: number;
}

interface FaceConfig {
  normal: [number, number, number];
  uVec: [number, number, number];
  vVec: [number, number, number];
  originOffset: [number, number, number];
  normalAxis: 0 | 1 | 2;
  uAxis: 0 | 1 | 2;
  vAxis: 0 | 1 | 2;
}

type BlockFilter = (blockType: BlockType) => boolean;

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

const FACE_CONFIGS: Record<number, FaceConfig> = {
  0: {
    normal: [1, 0, 0],
    uVec: [0, 0, 1],
    vVec: [0, 1, 0],
    originOffset: [1, 0, 0],
    normalAxis: 0,
    uAxis: 2,
    vAxis: 1,
  },
  1: {
    normal: [-1, 0, 0],
    uVec: [0, 0, -1],
    vVec: [0, 1, 0],
    originOffset: [0, 0, 1],
    normalAxis: 0,
    uAxis: 2,
    vAxis: 1,
  },
  2: {
    normal: [0, 1, 0],
    uVec: [1, 0, 0],
    vVec: [0, 0, 1],
    originOffset: [0, 1, 0],
    normalAxis: 1,
    uAxis: 0,
    vAxis: 2,
  },
  3: {
    normal: [0, -1, 0],
    uVec: [1, 0, 0],
    vVec: [0, 0, -1],
    originOffset: [0, 0, 1],
    normalAxis: 1,
    uAxis: 0,
    vAxis: 2,
  },
  4: {
    normal: [0, 0, 1],
    uVec: [0, 1, 0],
    vVec: [1, 0, 0],
    originOffset: [0, 0, 1],
    normalAxis: 2,
    uAxis: 1,
    vAxis: 0,
  },
  5: {
    normal: [0, 0, -1],
    uVec: [0, 1, 0],
    vVec: [-1, 0, 0],
    originOffset: [1, 0, 0],
    normalAxis: 2,
    uAxis: 1,
    vAxis: 0,
  },
};

type BlockGetter = (wx: number, wy: number, wz: number) => BlockType;

export function meshChunk(
  chunk: Chunk,
  getWorldBlock: BlockGetter,
  shouldMeshBlock: BlockFilter = (blockType) => blockType !== BlockType.AIR,
): MeshData {
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

  const isSolidBlock = (x: number, y: number, z: number): boolean => !TRANSPARENT_BLOCKS.has(getBlock(x, y, z));

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

  const setAxis = (
    coords: [number, number, number],
    axis: 0 | 1 | 2,
    value: number,
  ): void => {
    if (axis === 0) coords[0] = value;
    if (axis === 1) coords[1] = value;
    if (axis === 2) coords[2] = value;
  };

  const getAxis = (coords: [number, number, number], axis: 0 | 1 | 2): number => {
    if (axis === 0) return coords[0];
    if (axis === 1) return coords[1];
    return coords[2];
  };

  const appendQuad = (
    descriptor: FaceDescriptor,
    faceIndex: number,
    width: number,
    height: number,
  ): void => {
    const config = FACE_CONFIGS[faceIndex];
    const tileSize = 1 / ATLAS_TILES;
    const uMin = descriptor.tileIndex * tileSize;
    const uMax = uMin + tileSize;
    const vMin = 0;
    const vMax = 1;

    const baseX = descriptor.x + config.originOffset[0];
    const baseY = descriptor.y + config.originOffset[1];
    const baseZ = descriptor.z + config.originOffset[2];

    const p0: [number, number, number] = [baseX, baseY, baseZ];
    const p1: [number, number, number] = [
      baseX + config.vVec[0] * height,
      baseY + config.vVec[1] * height,
      baseZ + config.vVec[2] * height,
    ];
    const p3: [number, number, number] = [
      baseX + config.uVec[0] * width,
      baseY + config.uVec[1] * width,
      baseZ + config.uVec[2] * width,
    ];
    const p2: [number, number, number] = [
      p1[0] + config.uVec[0] * width,
      p1[1] + config.uVec[1] * width,
      p1[2] + config.uVec[2] * width,
    ];

    const quadVertices: [number, number, number][] = [p0, p1, p2, p3];
    const quadUvs: [number, number][] = [
      [uMin, vMin],
      [uMin, vMax],
      [uMax, vMax],
      [uMax, vMin],
    ];

    for (let vertexIndex = 0; vertexIndex < quadVertices.length; vertexIndex++) {
      const vertex = quadVertices[vertexIndex];
      const [u, v] = quadUvs[vertexIndex];
      const aoFactor = AO_FACTORS[descriptor.aoValues[vertexIndex]];

      positions.push(vertex[0], vertex[1], vertex[2]);
      normals.push(config.normal[0], config.normal[1], config.normal[2]);
      colors.push(aoFactor, aoFactor, aoFactor);
      uvs.push(u, v);
    }

    const shouldFlip =
      descriptor.aoValues[0] + descriptor.aoValues[2] >
      descriptor.aoValues[1] + descriptor.aoValues[3];

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
  };

  const canMerge = (left: FaceDescriptor, right: FaceDescriptor): boolean =>
    left.blockType === right.blockType &&
    left.tileIndex === right.tileIndex &&
    left.aoUniformValue !== null &&
    right.aoUniformValue !== null &&
    left.aoUniformValue === right.aoUniformValue;

  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    const faceAoOffsets = FACE_AO_OFFSETS[faceIndex];
    const config = FACE_CONFIGS[faceIndex];
    const mask: Array<FaceDescriptor | null> = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(null);
    const used: boolean[] = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(false);

    for (let slice = 0; slice < CHUNK_SIZE; slice++) {
      used.fill(false);

      for (let v = 0; v < CHUNK_SIZE; v++) {
        for (let u = 0; u < CHUNK_SIZE; u++) {
          const coords: [number, number, number] = [0, 0, 0];
          setAxis(coords, config.normalAxis, slice);

          const uSign = getAxis(config.uVec, config.uAxis) >= 0 ? 1 : -1;
          const vSign = getAxis(config.vVec, config.vAxis) >= 0 ? 1 : -1;

          setAxis(coords, config.uAxis, uSign === 1 ? u : CHUNK_SIZE - 1 - u);
          setAxis(coords, config.vAxis, vSign === 1 ? v : CHUNK_SIZE - 1 - v);

          const [x, y, z] = coords;
          const blockType = chunk.getBlock(x, y, z);
          const maskIndex = u + v * CHUNK_SIZE;

          if (!shouldMeshBlock(blockType)) {
            mask[maskIndex] = null;
            continue;
          }

          const [dx, dy, dz] = FACE_DIRECTIONS[faceIndex];
          const neighborType = getBlock(x + dx, y + dy, z + dz);
          const isTransparent = TRANSPARENT_BLOCKS.has(neighborType);
          const isSameType = neighborType === blockType;

          if (!isTransparent || isSameType) {
            mask[maskIndex] = null;
            continue;
          }

          const aoValues = faceAoOffsets.map((offsets) => getVertexAo(x, y, z, offsets)) as [
            number,
            number,
            number,
            number,
          ];
          const aoUniformValue =
            aoValues[0] === aoValues[1] &&
            aoValues[1] === aoValues[2] &&
            aoValues[2] === aoValues[3]
              ? aoValues[0]
              : null;

          mask[maskIndex] = {
            blockType,
            tileIndex: getBlockFaceTileIndex(blockType, faceIndex),
            aoValues,
            aoUniformValue,
            x,
            y,
            z,
          };
        }
      }

      for (let v = 0; v < CHUNK_SIZE; v++) {
        for (let u = 0; u < CHUNK_SIZE; u++) {
          const startIndex = u + v * CHUNK_SIZE;
          const descriptor = mask[startIndex];

          if (!descriptor || used[startIndex]) {
            continue;
          }

          let width = 1;

          while (u + width < CHUNK_SIZE) {
            const nextIndex = u + width + v * CHUNK_SIZE;
            const nextDescriptor = mask[nextIndex];

            if (!nextDescriptor || used[nextIndex] || !canMerge(descriptor, nextDescriptor)) {
              break;
            }

            width++;
          }

          let height = 1;

          while (v + height < CHUNK_SIZE) {
            let canGrow = true;

            for (let du = 0; du < width; du++) {
              const nextIndex = u + du + (v + height) * CHUNK_SIZE;
              const nextDescriptor = mask[nextIndex];

              if (!nextDescriptor || used[nextIndex] || !canMerge(descriptor, nextDescriptor)) {
                canGrow = false;
                break;
              }
            }

            if (!canGrow) {
              break;
            }

            height++;
          }

          for (let dv = 0; dv < height; dv++) {
            for (let du = 0; du < width; du++) {
              used[u + du + (v + dv) * CHUNK_SIZE] = true;
            }
          }

          appendQuad(descriptor, faceIndex, width, height);
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
