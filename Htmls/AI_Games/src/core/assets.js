// 素材管理：所有模型都透過 assets/catalog.json 用 id 取得，程式裡不寫死檔名。
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`讀取失敗：${url}（${res.status}）`);
  return res.json();
}

export class Assets {
  constructor() {
    this.loader = new GLTFLoader();
    this.catalog = {};
    this.loaded = new Map();
  }

  async init() {
    this.catalog = (await loadJson('assets/catalog.json')).models;
  }

  async preload(ids, onProgress) {
    const unique = [...new Set(ids)];
    let done = 0;
    await Promise.all(unique.map(async (id) => {
      const entry = this.catalog[id];
      if (!entry) throw new Error(`素材清單裡沒有「${id}」，請先匯入模型`);
      if (!this.loaded.has(id)) this.loaded.set(id, await this.loader.loadAsync(entry.file));
      onProgress?.(++done, unique.length);
    }));
  }

  // 每次呼叫都得到獨立的一份（可同時有很多隻）：幾何與貼圖共用，骨架與材質各自一份
  instantiate(id) {
    const gltf = this.loaded.get(id);
    if (!gltf) throw new Error(`模型「${id}」還沒載入`);
    const scene = cloneSkinned(gltf.scene);
    const materials = [];
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.material = obj.material.clone();
      materials.push(obj.material);
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.isSkinnedMesh) obj.frustumCulled = false; // 動作會讓角色超出綁定姿勢的範圍
    });
    return { scene, clips: gltf.animations, materials };
  }
}
