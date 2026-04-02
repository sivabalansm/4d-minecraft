export interface RaycastResult {
  blockX: number;
  blockY: number;
  blockZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

export function voxelRaycast(
  originX: number,
  originY: number,
  originZ: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  maxDistance: number,
  isSolid: (x: number, y: number, z: number) => boolean,
): RaycastResult | null {
  let voxelX = Math.floor(originX);
  let voxelY = Math.floor(originY);
  let voxelZ = Math.floor(originZ);

  if (isSolid(voxelX, voxelY, voxelZ)) {
    return {
      blockX: voxelX,
      blockY: voxelY,
      blockZ: voxelZ,
      normalX: 0,
      normalY: 0,
      normalZ: 0,
    };
  }

  const stepX = dirX > 0 ? 1 : dirX < 0 ? -1 : 0;
  const stepY = dirY > 0 ? 1 : dirY < 0 ? -1 : 0;
  const stepZ = dirZ > 0 ? 1 : dirZ < 0 ? -1 : 0;

  const deltaDistX = dirX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirX);
  const deltaDistY = dirY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirY);
  const deltaDistZ = dirZ === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirZ);

  let tMaxX =
    stepX === 0
      ? Number.POSITIVE_INFINITY
      : (stepX > 0 ? voxelX + 1 - originX : originX - voxelX) * deltaDistX;
  let tMaxY =
    stepY === 0
      ? Number.POSITIVE_INFINITY
      : (stepY > 0 ? voxelY + 1 - originY : originY - voxelY) * deltaDistY;
  let tMaxZ =
    stepZ === 0
      ? Number.POSITIVE_INFINITY
      : (stepZ > 0 ? voxelZ + 1 - originZ : originZ - voxelZ) * deltaDistZ;

  let traveled = 0;

  while (traveled <= maxDistance) {
    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;

    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      voxelX += stepX;
      traveled = tMaxX;
      tMaxX += deltaDistX;
      normalX = -stepX;
    } else if (tMaxY <= tMaxZ) {
      voxelY += stepY;
      traveled = tMaxY;
      tMaxY += deltaDistY;
      normalY = -stepY;
    } else {
      voxelZ += stepZ;
      traveled = tMaxZ;
      tMaxZ += deltaDistZ;
      normalZ = -stepZ;
    }

    if (traveled > maxDistance) {
      break;
    }

    if (isSolid(voxelX, voxelY, voxelZ)) {
      return {
        blockX: voxelX,
        blockY: voxelY,
        blockZ: voxelZ,
        normalX,
        normalY,
        normalZ,
      };
    }
  }

  return null;
}
