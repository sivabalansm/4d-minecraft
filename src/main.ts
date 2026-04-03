import * as THREE from 'three';
import { BASE_HEIGHT, BlockType, CHUNK_SIZE } from './constants';
import { Controls } from './player/Controls';
import { Player } from './player/Player';
import { RaycastResult, voxelRaycast } from './world/VoxelRaycast';
import { World } from './world/World';

const SKY_COLOR = 0x87CEEB;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(SKY_COLOR);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 100, 300);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362907, 0.6);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 200, 100);
scene.add(directionalLight);

const world = new World(scene, '4d-minecraft-seed');
const player = new Player(CHUNK_SIZE * 2, BASE_HEIGHT + 10, CHUNK_SIZE * 2, 0);
const controls = new Controls(camera, renderer.domElement);
const timer = new THREE.Timer();

const MOVE_SPEED = 5;
const JUMP_VELOCITY = 8;
const GRAVITY = 20;
const DESCEND_ACCELERATION = 20;
const GROUND_DAMPING = 14;
const AIR_DAMPING = 2;
const LOAD_DISTANCE_SQ = 4;
const COLLISION_EPSILON = 1e-6;
const MAX_INTERACT_DISTANCE = 8;
const UP = new THREE.Vector3(0, 1, 0);
const cameraDirection = new THREE.Vector3();
const lastLoadedPosition = new THREE.Vector3(player.position.x, player.position.y, player.position.z);

let selectedBlockType = BlockType.STONE;
let currentTarget: RaycastResult | null = null;

const BLOCK_TYPE_NAMES: Record<BlockType, string> = {
  [BlockType.AIR]: 'AIR',
  [BlockType.STONE]: 'STONE',
  [BlockType.DIRT]: 'DIRT',
  [BlockType.GRASS]: 'GRASS',
};

const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005));
const highlightMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.9,
});
const blockHighlight = new THREE.LineSegments(highlightGeometry, highlightMaterial);
blockHighlight.visible = false;
scene.add(blockHighlight);

const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.top = '0';
hud.style.left = '0';
hud.style.width = '100%';
hud.style.height = '100%';
hud.style.pointerEvents = 'none';
hud.style.zIndex = '10';

const crosshair = document.createElement('div');
crosshair.textContent = '+';
crosshair.style.position = 'absolute';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.color = 'white';
crosshair.style.fontSize = '24px';
crosshair.style.textShadow = '1px 1px 2px black';

const wDisplay = document.createElement('div');
wDisplay.style.position = 'absolute';
wDisplay.style.top = '10px';
wDisplay.style.left = '10px';
wDisplay.style.color = 'white';
wDisplay.style.fontFamily = 'monospace';
wDisplay.style.fontSize = '16px';
wDisplay.style.textShadow = '1px 1px 2px black';

const blockDisplay = document.createElement('div');
blockDisplay.style.position = 'absolute';
blockDisplay.style.top = '30px';
blockDisplay.style.left = '10px';
blockDisplay.style.color = 'white';
blockDisplay.style.fontFamily = 'monospace';
blockDisplay.style.fontSize = '14px';
blockDisplay.style.textShadow = '1px 1px 2px black';

const ghostDisplay = document.createElement('div');
ghostDisplay.id = 'ghost-display';
ghostDisplay.style.position = 'absolute';
ghostDisplay.style.top = '50px';
ghostDisplay.style.left = '10px';
ghostDisplay.style.color = 'white';
ghostDisplay.style.fontFamily = 'monospace';
ghostDisplay.style.fontSize = '14px';
ghostDisplay.style.textShadow = '1px 1px 2px black';

const controlsHelp = document.createElement('div');
controlsHelp.style.position = 'absolute';
controlsHelp.style.bottom = '10px';
controlsHelp.style.left = '10px';
controlsHelp.style.color = 'rgba(255,255,255,0.6)';
controlsHelp.style.fontFamily = 'monospace';
controlsHelp.style.fontSize = '12px';
controlsHelp.style.textShadow = '1px 1px 2px black';
controlsHelp.innerHTML =
  'WASD: Move | Space: Jump | Q/E: Shift W-dimension | G: Toggle Ghosts<br>Left Click: Destroy | Right Click: Place | 1-3: Select Block';

const clickToPlay = document.createElement('div');
clickToPlay.style.position = 'absolute';
clickToPlay.style.top = '50%';
clickToPlay.style.left = '50%';
clickToPlay.style.transform = 'translate(-50%, -50%)';
clickToPlay.style.color = 'white';
clickToPlay.style.fontFamily = 'sans-serif';
clickToPlay.style.fontSize = '24px';
clickToPlay.style.textShadow = '2px 2px 4px black';
clickToPlay.style.textAlign = 'center';
clickToPlay.innerHTML = 'Click to Play<br><span style="font-size: 14px; opacity: 0.7;">4D Minecraft</span>';

hud.append(crosshair, wDisplay, blockDisplay, ghostDisplay, controlsHelp, clickToPlay);
document.body.appendChild(hud);

function getSelectedBlockShortcut(type: BlockType): string {
  if (type === BlockType.STONE) return '1';
  if (type === BlockType.DIRT) return '2';
  if (type === BlockType.GRASS) return '3';
  return '?';
}

function updateHudText(): void {
  wDisplay.textContent = `W: ${world.getCurrentW()}`;
  blockDisplay.textContent = `Block: ${BLOCK_TYPE_NAMES[selectedBlockType]} [${getSelectedBlockShortcut(selectedBlockType)}]`;
  ghostDisplay.textContent = `Ghosts: ${world.areGhostsEnabled() ? 'ON' : 'OFF'}`;
  clickToPlay.style.display = controls.isPointerLocked() ? 'none' : 'block';
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyG' && !event.repeat) {
    const enabled = !world.areGhostsEnabled();
    world.setGhostsEnabled(enabled);

    if (enabled) {
      world.loadGhosts(player.position.x, player.position.y, player.position.z);
    }
  } else if (event.code === 'Digit1') {
    selectedBlockType = BlockType.STONE;
  } else if (event.code === 'Digit2') {
    selectedBlockType = BlockType.DIRT;
  } else if (event.code === 'Digit3') {
    selectedBlockType = BlockType.GRASS;
  } else {
    return;
  }

  updateHudText();
});

updateHudText();

function isSolidBlock(wx: number, wy: number, wz: number): boolean {
  return world.getBlock(wx, wy, wz) !== BlockType.AIR;
}

function isSolidRange(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
): boolean {
  const startX = Math.floor(xMin);
  const endX = Math.floor(xMax - COLLISION_EPSILON);
  const startY = Math.floor(yMin);
  const endY = Math.floor(yMax - COLLISION_EPSILON);
  const startZ = Math.floor(zMin);
  const endZ = Math.floor(zMax - COLLISION_EPSILON);

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      for (let z = startZ; z <= endZ; z++) {
        if (isSolidBlock(x, y, z)) {
          return true;
        }
      }
    }
  }

  return false;
}

function resolveX(deltaX: number): void {
  if (deltaX === 0) {
    return;
  }

  const halfWidth = Player.WIDTH / 2;
  let nextX = player.position.x + deltaX;

  const yMin = player.position.y;
  const yMax = player.position.y + Player.HEIGHT;
  const zMin = player.position.z - halfWidth;
  const zMax = player.position.z + halfWidth;

  if (deltaX > 0) {
    const oldMaxX = player.position.x + halfWidth;
    const newMaxX = nextX + halfWidth;
    const startBlockX = Math.floor(oldMaxX) + 1;
    const endBlockX = Math.floor(newMaxX);

    for (let blockX = startBlockX; blockX <= endBlockX; blockX++) {
      if (!isSolidRange(blockX, blockX + 1, yMin, yMax, zMin, zMax)) {
        continue;
      }

      nextX = blockX - halfWidth;
      player.velocity.x = 0;
      break;
    }
  } else {
    const oldMinX = player.position.x - halfWidth;
    const newMinX = nextX - halfWidth;
    const startBlockX = Math.floor(oldMinX) - 1;
    const endBlockX = Math.floor(newMinX);

    for (let blockX = startBlockX; blockX >= endBlockX; blockX--) {
      if (!isSolidRange(blockX, blockX + 1, yMin, yMax, zMin, zMax)) {
        continue;
      }

      nextX = blockX + 1 + halfWidth;
      player.velocity.x = 0;
      break;
    }
  }

  player.position.x = nextX;
}

function resolveY(deltaY: number): void {
  if (deltaY === 0) {
    return;
  }

  const halfWidth = Player.WIDTH / 2;
  let nextY = player.position.y + deltaY;

  const xMin = player.position.x - halfWidth;
  const xMax = player.position.x + halfWidth;
  const zMin = player.position.z - halfWidth;
  const zMax = player.position.z + halfWidth;

  if (deltaY > 0) {
    const oldTopY = player.position.y + Player.HEIGHT;
    const newTopY = nextY + Player.HEIGHT;
    const startBlockY = Math.floor(oldTopY) + 1;
    const endBlockY = Math.floor(newTopY);

    for (let blockY = startBlockY; blockY <= endBlockY; blockY++) {
      if (!isSolidRange(xMin, xMax, blockY, blockY + 1, zMin, zMax)) {
        continue;
      }

      nextY = blockY - Player.HEIGHT;
      player.velocity.y = 0;
      break;
    }
  } else {
    const oldBottomY = player.position.y;
    const newBottomY = nextY;
    const startBlockY = Math.floor(oldBottomY) - 1;
    const endBlockY = Math.floor(newBottomY);

    for (let blockY = startBlockY; blockY >= endBlockY; blockY--) {
      if (!isSolidRange(xMin, xMax, blockY, blockY + 1, zMin, zMax)) {
        continue;
      }

      nextY = blockY + 1;
      player.velocity.y = 0;
      player.onGround = true;
      break;
    }
  }

  player.position.y = nextY;
}

function hasGroundSupport(): boolean {
  const halfWidth = Player.WIDTH / 2;
  return isSolidRange(
    player.position.x - halfWidth,
    player.position.x + halfWidth,
    player.position.y - 0.05,
    player.position.y,
    player.position.z - halfWidth,
    player.position.z + halfWidth,
  );
}

function tryShiftW(): void {
  const wShift = controls.consumeWShift();

  if (wShift === 0) {
    return;
  }

  const targetW = player.w + wShift;

  if (!world.isPositionSafe(player.position.x, player.position.y, player.position.z, targetW)) {
    return;
  }

  player.w = targetW;
  world.setW(targetW);
  world.loadAroundPosition(player.position.x, player.position.y, player.position.z);
  world.loadGhosts(player.position.x, player.position.y, player.position.z);
  lastLoadedPosition.copy(player.position);
}

function updateTargetBlock(): void {
  camera.getWorldDirection(cameraDirection);

  currentTarget = voxelRaycast(
    camera.position.x,
    camera.position.y,
    camera.position.z,
    cameraDirection.x,
    cameraDirection.y,
    cameraDirection.z,
    MAX_INTERACT_DISTANCE,
    isSolidBlock,
  );

  if (!currentTarget) {
    blockHighlight.visible = false;
    return;
  }

  blockHighlight.visible = true;
  blockHighlight.position.set(
    currentTarget.blockX + 0.5,
    currentTarget.blockY + 0.5,
    currentTarget.blockZ + 0.5,
  );
}

function overlapsPlayer(blockX: number, blockY: number, blockZ: number): boolean {
  const halfWidth = Player.WIDTH / 2;

  const playerMinX = player.position.x - halfWidth;
  const playerMaxX = player.position.x + halfWidth;
  const playerMinY = player.position.y;
  const playerMaxY = player.position.y + Player.HEIGHT;
  const playerMinZ = player.position.z - halfWidth;
  const playerMaxZ = player.position.z + halfWidth;

  const blockMinX = blockX;
  const blockMaxX = blockX + 1;
  const blockMinY = blockY;
  const blockMaxY = blockY + 1;
  const blockMinZ = blockZ;
  const blockMaxZ = blockZ + 1;

  return (
    playerMinX < blockMaxX &&
    playerMaxX > blockMinX &&
    playerMinY < blockMaxY &&
    playerMaxY > blockMinY &&
    playerMinZ < blockMaxZ &&
    playerMaxZ > blockMinZ
  );
}

function handleBlockInteractions(): void {
  const shouldDestroy = controls.consumeDestroy();
  const shouldPlace = controls.consumePlace();

  if (!controls.isPointerLocked() || !currentTarget) {
    return;
  }

  if (shouldDestroy) {
    world.setBlock(currentTarget.blockX, currentTarget.blockY, currentTarget.blockZ, BlockType.AIR);
  }

  if (!shouldPlace) {
    return;
  }

  const placeX = currentTarget.blockX + currentTarget.normalX;
  const placeY = currentTarget.blockY + currentTarget.normalY;
  const placeZ = currentTarget.blockZ + currentTarget.normalZ;

  if (overlapsPlayer(placeX, placeY, placeZ)) {
    return;
  }

  world.setBlock(placeX, placeY, placeZ, selectedBlockType);
}

function updatePlayer(dt: number): void {
  tryShiftW();

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;

  if (forward.lengthSq() > 0) {
    forward.normalize();
  }

  const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
  const moveDirection = new THREE.Vector3();

  if (controls.isMoveForwardPressed()) {
    moveDirection.add(forward);
  }

  if (controls.isMoveBackwardPressed()) {
    moveDirection.sub(forward);
  }

  if (controls.isMoveLeftPressed()) {
    moveDirection.sub(right);
  }

  if (controls.isMoveRightPressed()) {
    moveDirection.add(right);
  }

  if (moveDirection.lengthSq() > 0) {
    moveDirection.normalize();
    player.velocity.x = moveDirection.x * MOVE_SPEED;
    player.velocity.z = moveDirection.z * MOVE_SPEED;
  } else {
    const damping = Math.exp(-(player.onGround ? GROUND_DAMPING : AIR_DAMPING) * dt);
    player.velocity.x *= damping;
    player.velocity.z *= damping;
  }

  if (controls.isJumpPressed() && player.onGround) {
    player.velocity.y = JUMP_VELOCITY;
    player.onGround = false;
  }

  if (controls.isDescendPressed() && !player.onGround) {
    player.velocity.y -= DESCEND_ACCELERATION * dt;
  }

  player.velocity.y -= GRAVITY * dt;
  player.onGround = false;

  resolveX(player.velocity.x * dt);
  resolveY(player.velocity.y * dt);
  resolveZ(player.velocity.z * dt);

  if (!player.onGround && player.velocity.y <= 0 && hasGroundSupport()) {
    player.onGround = true;
    player.velocity.y = 0;
  }

  camera.position.copy(player.getEyePosition());

  if (player.position.distanceToSquared(lastLoadedPosition) > LOAD_DISTANCE_SQ) {
    world.loadAroundPosition(player.position.x, player.position.y, player.position.z);
    world.loadGhosts(player.position.x, player.position.y, player.position.z);
    lastLoadedPosition.copy(player.position);
  }
}

function resolveZ(deltaZ: number): void {
  if (deltaZ === 0) {
    return;
  }

  const halfWidth = Player.WIDTH / 2;
  let nextZ = player.position.z + deltaZ;

  const xMin = player.position.x - halfWidth;
  const xMax = player.position.x + halfWidth;
  const yMin = player.position.y;
  const yMax = player.position.y + Player.HEIGHT;

  if (deltaZ > 0) {
    const oldMaxZ = player.position.z + halfWidth;
    const newMaxZ = nextZ + halfWidth;
    const startBlockZ = Math.floor(oldMaxZ) + 1;
    const endBlockZ = Math.floor(newMaxZ);

    for (let blockZ = startBlockZ; blockZ <= endBlockZ; blockZ++) {
      if (!isSolidRange(xMin, xMax, yMin, yMax, blockZ, blockZ + 1)) {
        continue;
      }

      nextZ = blockZ - halfWidth;
      player.velocity.z = 0;
      break;
    }
  } else {
    const oldMinZ = player.position.z - halfWidth;
    const newMinZ = nextZ - halfWidth;
    const startBlockZ = Math.floor(oldMinZ) - 1;
    const endBlockZ = Math.floor(newMinZ);

    for (let blockZ = startBlockZ; blockZ >= endBlockZ; blockZ--) {
      if (!isSolidRange(xMin, xMax, yMin, yMax, blockZ, blockZ + 1)) {
        continue;
      }

      nextZ = blockZ + 1 + halfWidth;
      player.velocity.z = 0;
      break;
    }
  }

  player.position.z = nextZ;
}

camera.position.copy(player.getEyePosition());
camera.lookAt(CHUNK_SIZE * 2, BASE_HEIGHT, CHUNK_SIZE * 2 + 50);

world.loadAroundPosition(player.position.x, player.position.y, player.position.z);
world.loadGhosts(player.position.x, player.position.y, player.position.z);

function animate(): void {
  requestAnimationFrame(animate);
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  updatePlayer(dt);
  updateTargetBlock();
  handleBlockInteractions();
  updateHudText();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
