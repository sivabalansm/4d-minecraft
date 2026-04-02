import * as THREE from 'three';

export class Player {
  static readonly WIDTH = 0.6;
  static readonly HEIGHT = 1.8;
  static readonly EYE_HEIGHT = 1.6;

  position: THREE.Vector3;
  velocity: THREE.Vector3;
  w: number;
  onGround: boolean;

  constructor(x: number, y: number, z: number, w: number) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3();
    this.w = w;
    this.onGround = false;
  }

  getEyePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + Player.EYE_HEIGHT,
      this.position.z,
    );
  }
}
