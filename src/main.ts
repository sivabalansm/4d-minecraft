import * as THREE from 'three';
import { BASE_HEIGHT, BlockType, CHUNK_SIZE, SOLID_BLOCKS } from './constants';
import { SoundManager } from './audio/SoundManager';
import { Mob } from './entities/Mob';
import { Controls } from './player/Controls';
import { Player } from './player/Player';
import { WMinimap } from './ui/WMinimap';
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
scene.fog = new THREE.Fog(SKY_COLOR, 150, 400);

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
const soundManager = new SoundManager();
const minimap = new WMinimap();
const timer = new THREE.Timer();

const cloudCanvas = document.createElement('canvas');
cloudCanvas.width = 256;
cloudCanvas.height = 256;
const cloudCtx = cloudCanvas.getContext('2d');

if (!cloudCtx) {
  throw new Error('Failed to create cloud texture context');
}

cloudCtx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);

for (let i = 0; i < 20; i++) {
  const x = Math.random() * cloudCanvas.width;
  const y = Math.random() * cloudCanvas.height;
  const radius = 20 + Math.random() * 40;
  const alpha = 0.2 + Math.random() * 0.35;

  cloudCtx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
  cloudCtx.beginPath();
  cloudCtx.arc(x, y, radius, 0, Math.PI * 2);
  cloudCtx.fill();
}

const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
cloudTexture.wrapS = THREE.RepeatWrapping;
cloudTexture.wrapT = THREE.RepeatWrapping;
cloudTexture.repeat.set(8, 8);
cloudTexture.needsUpdate = true;

const cloudMaterial = new THREE.MeshBasicMaterial({
  map: cloudTexture,
  transparent: true,
  opacity: 0.4,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), cloudMaterial);
clouds.rotation.x = -Math.PI / 2;
clouds.position.y = 100;
scene.add(clouds);

const MOVE_SPEED = 5;
const JUMP_VELOCITY = 8;
const GRAVITY = 20;
const DESCEND_ACCELERATION = 20;
const GROUND_DAMPING = 14;
const AIR_DAMPING = 2;
const LOAD_DISTANCE_SQ = 4;
const COLLISION_EPSILON = 1e-6;
const MAX_INTERACT_DISTANCE = 8;
const SPRINT_SPEED_MULTIPLIER = 1.6;
const WALK_FOV = 75;
const SPRINT_FOV = 85;
const DOUBLE_TAP_SPRINT_WINDOW = 0.28;
const FOOTSTEP_INTERVAL_WALK = 0.4;
const FOOTSTEP_INTERVAL_SPRINT = 0.25;
const PORTAL_COOLDOWN = 0.5;
const MAX_MOBS = 8;
const UP = new THREE.Vector3(0, 1, 0);
const cameraDirection = new THREE.Vector3();
const lastLoadedPosition = new THREE.Vector3(player.position.x, player.position.y, player.position.z);

let selectedBlockType = BlockType.STONE;
let currentTarget: RaycastResult | null = null;
let isSprinting = false;
let sprintArmedByDoubleTap = false;
let lastForwardTapTime = -Infinity;
let lastFootstepTime = 0;
let lastMinimapUpdate = 0;
let lastMobSpawn = 0;
let portalCooldownRemaining = 0;
let audioResumed = false;
const mobs: Mob[] = [];

const BLOCK_TYPE_NAMES: Record<BlockType, string> = {
  [BlockType.AIR]: 'AIR',
  [BlockType.STONE]: 'STONE',
  [BlockType.DIRT]: 'DIRT',
  [BlockType.GRASS]: 'GRASS',
  [BlockType.WATER]: 'WATER',
  [BlockType.WOOD]: 'WOOD',
  [BlockType.LEAVES]: 'LEAVES',
  [BlockType.SAND]: 'SAND',
  [BlockType.PORTAL]: 'PORTAL',
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

const sprintDisplay = document.createElement('div');
sprintDisplay.style.position = 'absolute';
sprintDisplay.style.top = '70px';
sprintDisplay.style.left = '10px';
sprintDisplay.style.color = '#ffe566';
sprintDisplay.style.fontFamily = 'monospace';
sprintDisplay.style.fontSize = '14px';
sprintDisplay.style.textShadow = '1px 1px 2px black';
sprintDisplay.style.display = 'none';

const controlsHelp = document.createElement('div');
controlsHelp.style.position = 'absolute';
controlsHelp.style.bottom = '10px';
controlsHelp.style.left = '10px';
controlsHelp.style.color = 'rgba(255,255,255,0.6)';
controlsHelp.style.fontFamily = 'monospace';
controlsHelp.style.fontSize = '12px';
controlsHelp.style.textShadow = '1px 1px 2px black';
controlsHelp.innerHTML =
  'WASD: Move | Ctrl/Double-tap W: Sprint | Space: Jump | Q/E: Shift W-dimension | G: Toggle Ghosts<br>Left Click: Destroy | Right Click: Place | 1-8: Select Block';

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

hud.append(crosshair, wDisplay, blockDisplay, ghostDisplay, sprintDisplay, controlsHelp, clickToPlay);
document.body.appendChild(hud);

const transitionOverlay = document.createElement('div');
transitionOverlay.style.cssText =
  'position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:5;transition:opacity 0.15s ease-out;';
document.body.appendChild(transitionOverlay);

function flashTransition(): void {
  transitionOverlay.style.opacity = '0.4';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      transitionOverlay.style.opacity = '0';
    });
  });
}

function getSelectedBlockShortcut(type: BlockType): string {
  if (type === BlockType.STONE) return '1';
  if (type === BlockType.DIRT) return '2';
  if (type === BlockType.GRASS) return '3';
  if (type === BlockType.WATER) return '4';
  if (type === BlockType.WOOD) return '5';
  if (type === BlockType.LEAVES) return '6';
  if (type === BlockType.SAND) return '7';
  if (type === BlockType.PORTAL) return '8';
  return '?';
}

function updateHudText(): void {
  wDisplay.textContent = `W: ${world.getCurrentW()}`;
  blockDisplay.textContent = `Block: ${BLOCK_TYPE_NAMES[selectedBlockType]} [${getSelectedBlockShortcut(selectedBlockType)}]`;
  ghostDisplay.textContent = `Ghosts: ${world.areGhostsEnabled() ? 'ON' : 'OFF'}`;
  sprintDisplay.textContent = isSprinting ? 'Sprinting' : '';
  sprintDisplay.style.display = isSprinting ? 'block' : 'none';
  clickToPlay.style.display = controls.isPointerLocked() ? 'none' : 'block';
}

renderer.domElement.addEventListener('click', () => {
  if (audioResumed) {
    return;
  }

  soundManager.resume();
  audioResumed = true;
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyW' && !event.repeat) {
    const now = performance.now() / 1000;
    if (now - lastForwardTapTime <= DOUBLE_TAP_SPRINT_WINDOW) {
      sprintArmedByDoubleTap = true;
    }
    lastForwardTapTime = now;
  }

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
  } else if (event.code === 'Digit4') {
    selectedBlockType = BlockType.WATER;
  } else if (event.code === 'Digit5') {
    selectedBlockType = BlockType.WOOD;
  } else if (event.code === 'Digit6') {
    selectedBlockType = BlockType.LEAVES;
  } else if (event.code === 'Digit7') {
    selectedBlockType = BlockType.SAND;
  } else if (event.code === 'Digit8') {
    selectedBlockType = BlockType.PORTAL;
  } else {
    return;
  }

  updateHudText();
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'KeyW') {
    sprintArmedByDoubleTap = false;
  }
});

updateHudText();

function isSolidBlock(wx: number, wy: number, wz: number): boolean {
  return SOLID_BLOCKS.has(world.getBlock(wx, wy, wz));
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
  clearMobs();
  soundManager.playWShift();
  flashTransition();
  portalCooldownRemaining = PORTAL_COOLDOWN;
  lastLoadedPosition.copy(player.position);
}

function clearMobs(): void {
  for (const mob of mobs) {
    mob.dispose(scene);
  }
  mobs.length = 0;
}

function checkPortalTeleport(): void {
  if (portalCooldownRemaining > 0) {
    return;
  }

  const blockX = Math.floor(player.position.x);
  const blockY = Math.floor(player.position.y);
  const blockZ = Math.floor(player.position.z);
  const blockAtFeet = world.getBlock(blockX, blockY, blockZ);

  if (blockAtFeet !== BlockType.PORTAL) {
    return;
  }

  const targetW = player.w === 0 ? 3 : 0;
  if (!world.isPositionSafe(player.position.x, player.position.y, player.position.z, targetW)) {
    return;
  }

  player.w = targetW;
  world.setW(targetW);
  world.loadAroundPosition(player.position.x, player.position.y, player.position.z);
  world.loadGhosts(player.position.x, player.position.y, player.position.z);
  clearMobs();
  soundManager.playWShift();
  flashTransition();
  portalCooldownRemaining = PORTAL_COOLDOWN;
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
    soundManager.playBlockBreak();
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
  soundManager.playBlockPlace();
}

function spawnMobs(): void {
  if (mobs.length >= MAX_MOBS) {
    return;
  }

  const angle = Math.random() * Math.PI * 2;
  const dist = 20 + Math.random() * 20;
  const spawnX = player.position.x + Math.cos(angle) * dist;
  const spawnZ = player.position.z + Math.sin(angle) * dist;

  for (let y = 60; y >= 0; y--) {
    if (SOLID_BLOCKS.has(world.getBlock(Math.floor(spawnX), y, Math.floor(spawnZ)))) {
      mobs.push(new Mob(spawnX, y + 1, spawnZ, player.w, scene));
      return;
    }
  }
}

function updateMobs(dt: number): void {
  for (const mob of mobs) {
    mob.update(dt, (x, y, z) => world.getBlockAtW(x, y, z, mob.w));
  }

  for (let i = mobs.length - 1; i >= 0; i--) {
    const mob = mobs[i];
    if (mob.position.distanceTo(player.position) > 80 || mob.w !== player.w) {
      mob.dispose(scene);
      mobs.splice(i, 1);
    }
  }
}

function updatePlayer(dt: number, elapsed: number): void {
  portalCooldownRemaining = Math.max(0, portalCooldownRemaining - dt);
  tryShiftW();

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;

  if (forward.lengthSq() > 0) {
    forward.normalize();
  }

  const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
  const moveDirection = new THREE.Vector3();
  const forwardPressed = controls.isMoveForwardPressed();

  if (forwardPressed) {
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
    const sprintRequested =
      (controls.isSprintPressed() || sprintArmedByDoubleTap) && forwardPressed && player.onGround;
    isSprinting = sprintRequested;
    const currentSpeed = isSprinting ? MOVE_SPEED * SPRINT_SPEED_MULTIPLIER : MOVE_SPEED;
    moveDirection.normalize();
    player.velocity.x = moveDirection.x * currentSpeed;
    player.velocity.z = moveDirection.z * currentSpeed;
  } else {
    isSprinting = false;
    const damping = Math.exp(-(player.onGround ? GROUND_DAMPING : AIR_DAMPING) * dt);
    player.velocity.x *= damping;
    player.velocity.z *= damping;
  }

  if (controls.isJumpPressed() && player.onGround) {
    player.velocity.y = JUMP_VELOCITY;
    player.onGround = false;
    soundManager.playJump();
  }

  if (controls.isDescendPressed() && !player.onGround) {
    player.velocity.y -= DESCEND_ACCELERATION * dt;
  }

  player.velocity.y -= GRAVITY * dt;
  player.onGround = false;

  resolveX(player.velocity.x * dt);
  resolveY(player.velocity.y * dt);
  resolveZ(player.velocity.z * dt);
  checkPortalTeleport();

  if (!player.onGround && player.velocity.y <= 0 && hasGroundSupport()) {
    player.onGround = true;
    player.velocity.y = 0;
  }

  const movingHorizontally = Math.hypot(player.velocity.x, player.velocity.z) > 0.25;
  if (controls.isPointerLocked() && player.onGround && movingHorizontally) {
    const interval = isSprinting ? FOOTSTEP_INTERVAL_SPRINT : FOOTSTEP_INTERVAL_WALK;
    if (elapsed - lastFootstepTime >= interval) {
      soundManager.playFootstep();
      lastFootstepTime = elapsed;
    }
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
  const elapsed = timer.getElapsed();
  updatePlayer(dt, elapsed);

  if (elapsed - lastMobSpawn > 2) {
    spawnMobs();
    lastMobSpawn = elapsed;
  }
  updateMobs(dt);

  if (elapsed - lastMinimapUpdate > 0.5) {
    minimap.update(player.position.x, player.position.z, player.w, world);
    lastMinimapUpdate = elapsed;
  }

  const targetFov = isSprinting ? SPRINT_FOV : WALK_FOV;
  camera.fov += (targetFov - camera.fov) * 0.1;
  camera.updateProjectionMatrix();

  clouds.position.x = player.position.x + Math.sin(elapsed * 0.5) * 10;
  clouds.position.z = player.position.z + Math.cos(elapsed * 0.3) * 10;
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
