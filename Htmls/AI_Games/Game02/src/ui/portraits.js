// 角色清單的頭像：載入時用模型直接拍一張，新增角色不必另外準備圖片。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SIZE = 256;
const POSE_TIME = 0.1;
const FOV = 20;
const FRAME_MARGIN = 1.12;

function shoot(renderer, scene, camera, assets, modelId) {
  const instance = assets.instantiate(modelId);
  const mixer = new THREE.AnimationMixer(instance.scene);
  const idle = instance.clips.find((c) => c.name === 'Idle');
  if (idle) mixer.clipAction(idle).play();
  mixer.update(POSE_TIME);
  scene.add(instance.scene);
  scene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(instance.scene);
  const height = box.max.y - box.min.y;
  const centerY = (box.max.y + box.min.y) / 2;
  const distance = (height * FRAME_MARGIN) / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  camera.position.set(0, centerY, distance);
  camera.lookAt(0, centerY, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');

  scene.remove(instance.scene);
  mixer.stopAllAction();
  mixer.uncacheRoot(instance.scene);
  for (const m of instance.materials) m.dispose();
  return url;
}

// modelIds：角色 id → 模型 id。回傳角色 id → 圖片網址
export function renderPortraits(assets, modelIds) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 4, 5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  const portraits = {};
  for (const [id, modelId] of Object.entries(modelIds)) portraits[id] = shoot(renderer, scene, camera, assets, modelId);
  renderer.dispose();
  renderer.forceContextLoss();
  return portraits;
}
