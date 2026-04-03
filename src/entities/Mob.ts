import * as THREE from 'three';
import { BlockType } from '../constants';

export enum MobType {
  SLIME = 'slime',
  SPIDER = 'spider',
  GHOST = 'ghost',
  FIREFLY = 'firefly',
}

type MobConfig = {
  size: [number, number, number];
  color: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: number;
  emissiveIntensity?: number;
};

const MOB_CONFIGS: Record<MobType, MobConfig> = {
  [MobType.SLIME]: {
    size: [0.8, 0.8, 0.8],
    color: 0x44cc44,
  },
  [MobType.SPIDER]: {
    size: [1.2, 0.5, 0.8],
    color: 0x331111,
  },
  [MobType.GHOST]: {
    size: [0.6, 0.6, 0.6],
    color: 0xccccff,
    transparent: true,
    opacity: 0.4,
  },
  [MobType.FIREFLY]: {
    size: [0.2, 0.2, 0.2],
    color: 0xaaff00,
    emissive: 0xaaff00,
    emissiveIntensity: 1.5,
  },
};

export class Mob {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
  w: number;
  type: MobType;
  moveTimer: number;

  private readonly halfHeight: number;
  private animationTime: number;
  private orbitAngle: number;
  private orbitSpeed: number;
  private hoverBaseY: number;

  static readonly SLIME_JUMP_INTERVAL_MIN = 1;
  static readonly SLIME_JUMP_INTERVAL_MAX = 3;
  static readonly SLIME_JUMP_SPEED = 5;
  static readonly SLIME_JUMP_HEIGHT = 6;
  static readonly SPIDER_SPEED = 4.5;
  static readonly GHOST_SPEED = 1.4;
  static readonly FIREFLY_SPEED = 1.2;

  constructor(x: number, y: number, z: number, w: number, type: MobType, scene: THREE.Scene) {
    const config = MOB_CONFIGS[type];

    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3();
    this.w = w;
    this.type = type;
    this.moveTimer = Math.random() * 2 + 1;
    this.animationTime = Math.random() * Math.PI * 2;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitSpeed = 3 + Math.random() * 2;
    this.hoverBaseY = y;
    this.halfHeight = config.size[1] / 2;

    const geometry = new THREE.BoxGeometry(config.size[0], config.size[1], config.size[2]);
    const materialParams: THREE.MeshLambertMaterialParameters = { color: config.color };
    if (config.transparent !== undefined) materialParams.transparent = config.transparent;
    if (config.opacity !== undefined) materialParams.opacity = config.opacity;
    if (config.emissive !== undefined) materialParams.emissive = config.emissive;
    if (config.emissiveIntensity !== undefined) materialParams.emissiveIntensity = config.emissiveIntensity;
    if (config.transparent) materialParams.depthWrite = false;
    const material = new THREE.MeshLambertMaterial(materialParams);

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.position.y += this.halfHeight;
    scene.add(this.mesh);
  }

  update(dt: number, getBlock: (x: number, y: number, z: number) => BlockType): void {
    this.animationTime += dt;

    switch (this.type) {
      case MobType.SLIME:
        this.updateSlime(dt, getBlock);
        break;
      case MobType.SPIDER:
        this.updateSpider(dt, getBlock);
        break;
      case MobType.GHOST:
        this.updateGhost(dt);
        break;
      case MobType.FIREFLY:
        this.updateFirefly(dt);
        break;
    }

    this.mesh.position.copy(this.position);
    this.mesh.position.y += this.halfHeight;
  }

  private updateSlime(dt: number, getBlock: (x: number, y: number, z: number) => BlockType): void {
    this.velocity.y -= 20 * dt;

    this.moveTimer -= dt;
    if (this.moveTimer <= 0 && this.isOnGround(getBlock)) {
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * Mob.SLIME_JUMP_SPEED;
      this.velocity.z = Math.sin(angle) * Mob.SLIME_JUMP_SPEED;
      this.velocity.y = Mob.SLIME_JUMP_HEIGHT;
      this.moveTimer =
        Mob.SLIME_JUMP_INTERVAL_MIN +
        Math.random() * (Mob.SLIME_JUMP_INTERVAL_MAX - Mob.SLIME_JUMP_INTERVAL_MIN);
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.resolveVerticalMotion(dt, getBlock);

    this.velocity.x *= 0.95;
    this.velocity.z *= 0.95;

    const squish = 1 + Math.sin(this.moveTimer * 5) * 0.1;
    this.mesh.scale.set(1, squish, 1);
  }

  private updateSpider(dt: number, getBlock: (x: number, y: number, z: number) => BlockType): void {
    this.velocity.y -= 20 * dt;

    this.moveTimer -= dt;
    if (this.moveTimer <= 0 && this.isOnGround(getBlock)) {
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * Mob.SPIDER_SPEED;
      this.velocity.z = Math.sin(angle) * Mob.SPIDER_SPEED;
      this.moveTimer = 0.8 + Math.random() * 1.4;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.resolveVerticalMotion(dt, getBlock);

    this.velocity.x *= 0.98;
    this.velocity.z *= 0.98;
    this.mesh.scale.set(1, 1, 1);

    if (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }
  }

  private updateGhost(dt: number): void {
    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * Mob.GHOST_SPEED;
      this.velocity.z = Math.sin(angle) * Mob.GHOST_SPEED;
      this.velocity.y = (Math.random() - 0.5) * 0.4;
      this.moveTimer = 1.5 + Math.random() * 2;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.hoverBaseY += this.velocity.y * dt;
    this.position.y = this.hoverBaseY + Math.sin(this.animationTime * 2.5) * 0.25;

    this.velocity.x *= 0.995;
    this.velocity.y *= 0.995;
    this.velocity.z *= 0.995;
    this.mesh.scale.set(1, 1, 1);
  }

  private updateFirefly(dt: number): void {
    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      this.orbitSpeed = 4 + Math.random() * 3;
      this.velocity.y = (Math.random() - 0.5) * 0.3;
      this.moveTimer = 0.8 + Math.random() * 1.2;
    }

    this.orbitAngle += this.orbitSpeed * dt;
    this.position.x += Math.cos(this.orbitAngle) * Mob.FIREFLY_SPEED * dt;
    this.position.z += Math.sin(this.orbitAngle) * Mob.FIREFLY_SPEED * dt;
    this.hoverBaseY += this.velocity.y * dt;
    this.position.y = this.hoverBaseY + Math.sin(this.animationTime * 9) * 0.18;
    this.mesh.scale.set(1, 1, 1);
  }

  private resolveVerticalMotion(
    dt: number,
    getBlock: (x: number, y: number, z: number) => BlockType,
  ): void {
    const newY = this.position.y + this.velocity.y * dt;
    const blockBelow = getBlock(Math.floor(this.position.x), Math.floor(newY), Math.floor(this.position.z));

    if (!this.isPassable(blockBelow) && this.velocity.y < 0) {
      this.position.y = Math.floor(newY) + 1;
      this.velocity.y = 0;
      return;
    }

    this.position.y = newY;
  }

  private isPassable(blockType: BlockType): boolean {
    return blockType === BlockType.AIR || blockType === BlockType.WATER || blockType === BlockType.LAVA;
  }

  isOnGround(getBlock: (x: number, y: number, z: number) => BlockType): boolean {
    const below = getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y - 0.1),
      Math.floor(this.position.z),
    );
    return !this.isPassable(below);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
