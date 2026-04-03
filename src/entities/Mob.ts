import * as THREE from 'three';
import { BlockType } from '../constants';

export class Mob {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
  w: number;
  jumpTimer: number;

  static readonly SIZE = 0.8;
  static readonly JUMP_INTERVAL_MIN = 1;
  static readonly JUMP_INTERVAL_MAX = 3;
  static readonly JUMP_SPEED = 5;
  static readonly JUMP_HEIGHT = 6;

  constructor(x: number, y: number, z: number, w: number, scene: THREE.Scene) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3();
    this.w = w;
    this.jumpTimer = Math.random() * 2 + 1;

    const geometry = new THREE.BoxGeometry(Mob.SIZE, Mob.SIZE, Mob.SIZE);
    const material = new THREE.MeshLambertMaterial({ color: 0x44cc44 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  update(dt: number, getBlock: (x: number, y: number, z: number) => BlockType): void {
    this.velocity.y -= 20 * dt;

    this.jumpTimer -= dt;
    if (this.jumpTimer <= 0 && this.isOnGround(getBlock)) {
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * Mob.JUMP_SPEED;
      this.velocity.z = Math.sin(angle) * Mob.JUMP_SPEED;
      this.velocity.y = Mob.JUMP_HEIGHT;
      this.jumpTimer =
        Mob.JUMP_INTERVAL_MIN + Math.random() * (Mob.JUMP_INTERVAL_MAX - Mob.JUMP_INTERVAL_MIN);
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const newY = this.position.y + this.velocity.y * dt;
    const blockBelow = getBlock(Math.floor(this.position.x), Math.floor(newY), Math.floor(this.position.z));

    if (blockBelow !== BlockType.AIR && blockBelow !== BlockType.WATER && this.velocity.y < 0) {
      this.position.y = Math.floor(newY) + 1;
      this.velocity.y = 0;
    } else {
      this.position.y = newY;
    }

    this.velocity.x *= 0.95;
    this.velocity.z *= 0.95;

    const squish = 1 + Math.sin(this.jumpTimer * 5) * 0.1;
    this.mesh.scale.set(1, squish, 1);

    this.mesh.position.copy(this.position);
    this.mesh.position.y += Mob.SIZE / 2;
  }

  isOnGround(getBlock: (x: number, y: number, z: number) => BlockType): boolean {
    const below = getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y - 0.1),
      Math.floor(this.position.z),
    );
    return below !== BlockType.AIR && below !== BlockType.WATER;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
