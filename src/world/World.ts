import * as THREE from 'three';
import { BlockType, CHUNK_SIZE, RENDER_DISTANCE } from '../constants';
import { createTextureAtlas } from '../rendering/TextureAtlas';
import { Chunk } from './Chunk';
import { meshChunk } from './ChunkMesher';
import { WorldGen } from './WorldGen';

const MIN_CHUNK_Y = -1;
const MAX_CHUNK_Y = 3;

export class World {
  private chunks: Map<string, Chunk>;
  private meshes: Map<string, THREE.Mesh>;
  private ghostMeshesWMinus: Map<string, THREE.Mesh>;
  private ghostMeshesWPlus: Map<string, THREE.Mesh>;
  private meshPool: THREE.Mesh[];
  private worldGen: WorldGen;
  private scene: THREE.Scene;
  private currentW: number;
  private atlasTexture: THREE.CanvasTexture;
  private chunkMaterial: THREE.MeshLambertMaterial;
  private ghostMaterialMinus: THREE.MeshLambertMaterial;
  private ghostMaterialPlus: THREE.MeshLambertMaterial;
  private ghostsEnabled: boolean;

  constructor(scene: THREE.Scene, seed: string) {
    this.chunks = new Map();
    this.meshes = new Map();
    this.ghostMeshesWMinus = new Map();
    this.ghostMeshesWPlus = new Map();
    this.meshPool = [];
    this.worldGen = new WorldGen(seed);
    this.scene = scene;
    this.currentW = 0;
    this.atlasTexture = createTextureAtlas();
    this.chunkMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      vertexColors: true,
    });
    this.ghostMaterialMinus = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      color: new THREE.Color(0.4, 0.6, 1.0),
    });
    this.ghostMaterialPlus = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      color: new THREE.Color(1.0, 0.6, 0.3),
    });
    this.ghostsEnabled = true;
  }

  getAtlasTexture(): THREE.CanvasTexture {
    return this.atlasTexture;
  }

  getOrCreateChunk(cx: number, cy: number, cz: number, cw: number): Chunk {
    const key = this.chunkKey(cx, cy, cz, cw);
    const existingChunk = this.chunks.get(key);

    if (existingChunk) {
      return existingChunk;
    }

    const chunk = this.worldGen.generateChunk(cx, cy, cz, cw);
    this.chunks.set(key, chunk);
    return chunk;
  }

  getBlock(wx: number, wy: number, wz: number): BlockType {
    return this.getBlockAtW(wx, wy, wz, this.currentW);
  }

  getBlockAtW(wx: number, wy: number, wz: number, ww: number): BlockType {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);

    const lx = wx - cx * CHUNK_SIZE;
    const ly = wy - cy * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;

    const chunk = this.getOrCreateChunk(cx, cy, cz, ww);
    return chunk.getBlock(lx, ly, lz);
  }

  setBlock(wx: number, wy: number, wz: number, type: BlockType): void {
    const blockX = Math.floor(wx);
    const blockY = Math.floor(wy);
    const blockZ = Math.floor(wz);

    const cx = Math.floor(blockX / CHUNK_SIZE);
    const cy = Math.floor(blockY / CHUNK_SIZE);
    const cz = Math.floor(blockZ / CHUNK_SIZE);

    const lx = blockX - cx * CHUNK_SIZE;
    const ly = blockY - cy * CHUNK_SIZE;
    const lz = blockZ - cz * CHUNK_SIZE;

    const chunk = this.getOrCreateChunk(cx, cy, cz, this.currentW);
    chunk.setBlock(lx, ly, lz, type);

    this.remeshChunk(cx, cy, cz);

    if (lx === 0) this.remeshChunkIfExists(cx - 1, cy, cz);
    if (lx === CHUNK_SIZE - 1) this.remeshChunkIfExists(cx + 1, cy, cz);
    if (ly === 0) this.remeshChunkIfExists(cx, cy - 1, cz);
    if (ly === CHUNK_SIZE - 1) this.remeshChunkIfExists(cx, cy + 1, cz);
    if (lz === 0) this.remeshChunkIfExists(cx, cy, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.remeshChunkIfExists(cx, cy, cz + 1);
  }

  loadAroundPosition(playerX: number, playerY: number, playerZ: number): void {
    const centerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const centerChunkY = Math.floor(playerY / CHUNK_SIZE);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE);
    const requiredMeshes = new Set<string>();

    for (let cz = centerChunkZ - RENDER_DISTANCE; cz <= centerChunkZ + RENDER_DISTANCE; cz++) {
      for (let cx = centerChunkX - RENDER_DISTANCE; cx <= centerChunkX + RENDER_DISTANCE; cx++) {
        const dx = cx - centerChunkX;
        const dz = cz - centerChunkZ;

        if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) {
          continue;
        }

        for (let cy = MIN_CHUNK_Y; cy <= MAX_CHUNK_Y; cy++) {
          if (Math.abs(cy - centerChunkY) > RENDER_DISTANCE) {
            continue;
          }

          const meshKey = this.meshKey(cx, cy, cz);
          requiredMeshes.add(meshKey);

          if (this.meshes.has(meshKey)) {
            continue;
          }

          const chunk = this.getOrCreateChunk(cx, cy, cz, this.currentW);
          const mesh = this.createChunkMesh(chunk);

          if (!mesh) {
            continue;
          }

          this.meshes.set(meshKey, mesh);
          this.scene.add(mesh);
        }
      }
    }

    for (const [key, mesh] of this.meshes.entries()) {
      if (requiredMeshes.has(key)) {
        continue;
      }

      this.scene.remove(mesh);
      this.releaseMesh(mesh);
      this.meshes.delete(key);
    }

    this.preloadWLayers(playerX, playerZ);
  }

  preloadWLayers(playerX: number, playerZ: number): void {
    const centerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE);

    for (const dw of [-1, 1]) {
      const targetW = this.currentW + dw;

      for (let cz = centerChunkZ - 2; cz <= centerChunkZ + 2; cz++) {
        for (let cx = centerChunkX - 2; cx <= centerChunkX + 2; cx++) {
          for (let cy = MIN_CHUNK_Y; cy <= MAX_CHUNK_Y; cy++) {
            this.getOrCreateChunk(cx, cy, cz, targetW);
          }
        }
      }
    }
  }

  loadGhosts(playerX: number, _playerY: number, playerZ: number): void {
    this.clearGhostMeshes();

    if (!this.ghostsEnabled) {
      return;
    }

    const centerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE);
    const GHOST_DISTANCE = 2;

    for (const [dw, ghostMeshMap, material] of [
      [-1, this.ghostMeshesWMinus, this.ghostMaterialMinus],
      [1, this.ghostMeshesWPlus, this.ghostMaterialPlus],
    ] as const) {
      const targetW = this.currentW + dw;

      for (let cz = centerChunkZ - GHOST_DISTANCE; cz <= centerChunkZ + GHOST_DISTANCE; cz++) {
        for (let cx = centerChunkX - GHOST_DISTANCE; cx <= centerChunkX + GHOST_DISTANCE; cx++) {
          for (let cy = MIN_CHUNK_Y; cy <= MAX_CHUNK_Y; cy++) {
            const chunk = this.getOrCreateChunk(cx, cy, cz, targetW);

            if (chunk.isEmpty()) {
              continue;
            }

            const meshData = meshChunk(chunk, (wx, wy, wz) => this.getBlockAtW(wx, wy, wz, targetW));

            if (meshData.vertexCount === 0) {
              continue;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
            geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
            geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
            geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE);
            mesh.renderOrder = 1;

            const key = this.meshKey(cx, cy, cz);
            ghostMeshMap.set(key, mesh);
            this.scene.add(mesh);
          }
        }
      }
    }
  }

  clearGhostMeshes(): void {
    for (const ghostMeshMap of [this.ghostMeshesWMinus, this.ghostMeshesWPlus]) {
      for (const mesh of ghostMeshMap.values()) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      }

      ghostMeshMap.clear();
    }
  }

  setGhostsEnabled(enabled: boolean): void {
    this.ghostsEnabled = enabled;

    if (!enabled) {
      this.clearGhostMeshes();
    }
  }

  areGhostsEnabled(): boolean {
    return this.ghostsEnabled;
  }

  getCurrentW(): number {
    return this.currentW;
  }

  setW(newW: number): void {
    for (const mesh of this.meshes.values()) {
      this.scene.remove(mesh);
      this.releaseMesh(mesh);
    }

    this.meshes.clear();
    this.clearGhostMeshes();
    this.currentW = newW;
  }

  isPositionSafe(wx: number, wy: number, wz: number, ww: number): boolean {
    const blockX = Math.floor(wx);
    const blockY = Math.floor(wy);
    const blockZ = Math.floor(wz);

    const feetBlock = this.getBlockAtW(blockX, blockY, blockZ, ww);
    const headBlock = this.getBlockAtW(blockX, blockY + 1, blockZ, ww);

    return feetBlock === BlockType.AIR && headBlock === BlockType.AIR;
  }

  private remeshChunk(cx: number, cy: number, cz: number): void {
    const key = this.meshKey(cx, cy, cz);
    const oldMesh = this.meshes.get(key);

    if (oldMesh) {
      this.scene.remove(oldMesh);
      this.releaseMesh(oldMesh);
      this.meshes.delete(key);
    }

    const chunk = this.getOrCreateChunk(cx, cy, cz, this.currentW);
    const newMesh = this.createChunkMesh(chunk);

    if (!newMesh) {
      return;
    }

    this.meshes.set(key, newMesh);
    this.scene.add(newMesh);
  }

  private remeshChunkIfExists(cx: number, cy: number, cz: number): void {
    if (!this.meshes.has(this.meshKey(cx, cy, cz))) {
      return;
    }

    this.remeshChunk(cx, cy, cz);
  }

  private chunkKey(cx: number, cy: number, cz: number, cw: number): string {
    return `${cx},${cy},${cz},${cw}`;
  }

  private meshKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  private createChunkMesh(chunk: Chunk): THREE.Mesh | null {
    if (chunk.isEmpty()) {
      return null;
    }

    const meshData = meshChunk(chunk, (wx, wy, wz) => this.getBlock(wx, wy, wz));

    if (meshData.vertexCount === 0) {
      return null;
    }

    const mesh = this.meshPool.pop() ?? new THREE.Mesh(new THREE.BufferGeometry(), this.chunkMaterial);
    const geometry = mesh.geometry as THREE.BufferGeometry;
    this.clearGeometry(geometry);

    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    mesh.material = this.chunkMaterial;
    mesh.position.set(
      chunk.cx * CHUNK_SIZE,
      chunk.cy * CHUNK_SIZE,
      chunk.cz * CHUNK_SIZE,
    );

    return mesh;
  }

  private releaseMesh(mesh: THREE.Mesh): void {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    this.clearGeometry(geometry);
    this.meshPool.push(mesh);
  }

  private clearGeometry(geometry: THREE.BufferGeometry): void {
    geometry.deleteAttribute('position');
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('color');
    geometry.deleteAttribute('uv');
    geometry.setIndex(null);
  }
}
