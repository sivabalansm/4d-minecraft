import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Controls {
  private pointerLockControls: PointerLockControls;
  private pressedKeys: Set<string>;
  private wShiftQueue: number;
  private pendingDestroy: boolean;
  private pendingPlace: boolean;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.pointerLockControls = new PointerLockControls(camera, domElement);
    this.pressedKeys = new Set<string>();
    this.wShiftQueue = 0;
    this.pendingDestroy = false;
    this.pendingPlace = false;

    domElement.addEventListener('click', () => {
      this.pointerLockControls.lock();
    });

    domElement.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.pendingDestroy = true;
      } else if (event.button === 2) {
        this.pendingPlace = true;
      }
    });

    domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    window.addEventListener('keydown', (event) => {
      this.pressedKeys.add(event.code);

      if (event.repeat) {
        return;
      }

      if (event.code === 'KeyQ') {
        this.wShiftQueue -= 1;
      } else if (event.code === 'KeyE') {
        this.wShiftQueue += 1;
      }
    });

    window.addEventListener('keyup', (event) => {
      this.pressedKeys.delete(event.code);
    });
  }

  isMoveForwardPressed(): boolean {
    return this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp');
  }

  isMoveBackwardPressed(): boolean {
    return this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown');
  }

  isMoveLeftPressed(): boolean {
    return this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft');
  }

  isMoveRightPressed(): boolean {
    return this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight');
  }

  isJumpPressed(): boolean {
    return this.pressedKeys.has('Space');
  }

  isDescendPressed(): boolean {
    return this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight');
  }

  consumeWShift(): number {
    if (this.wShiftQueue === 0) {
      return 0;
    }

    const shift = Math.sign(this.wShiftQueue);
    this.wShiftQueue -= shift;
    return shift;
  }

  consumeDestroy(): boolean {
    const destroy = this.pendingDestroy;
    this.pendingDestroy = false;
    return destroy;
  }

  consumePlace(): boolean {
    const place = this.pendingPlace;
    this.pendingPlace = false;
    return place;
  }

  isPointerLocked(): boolean {
    return this.pointerLockControls.isLocked;
  }
}
