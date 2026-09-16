import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// One renderer stays with the car from the introduction to the final image card.
export async function createViewer(container, config, { onProgress, onContextLost, signal } = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.75));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 80);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .025);
  scene.environment = environment.texture;
  scene.environmentIntensity = .75;
  room.dispose(); pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffedd7, .95);
  key.position.set(-3, 5, 4);
  const rim = new THREE.DirectionalLight(0xb3d4ff, .8);
  rim.position.set(4, 3, -2);
  scene.add(key, rim, new THREE.HemisphereLight(0xe8edf5, 0x37332e, .25));
  const draco = new DRACOLoader().setDecoderPath(new URL('./vendor/draco/', import.meta.url).href);
  draco.setWorkerLimit(2);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const materials = new Set(), textures = new Set();
  let loaded = false, disposed = false, visible = true, active = true;
  let width = 0, height = 0;
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x030506, side: THREE.DoubleSide, toneMapped: false, depthTest: false, depthWrite: false, transparent: true });
  materials.add(ledMaterial);
  const glows = [], fitPoints = [], opticalGuides = [];
  const canvasTexture = (paint, size = 128) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    paint(canvas.getContext('2d'), size);
    const texture = new THREE.CanvasTexture(canvas);
    textures.add(texture); return texture;
  };
  function draw() {
    if (loaded && visible && active && !disposed && !document.hidden) renderer.render(scene, camera);
  }
  function fitCamera() {
    if (!loaded) return;
    // Fit the rotated body and wing at portrait and wide aspect ratios.
    const rotation = new THREE.Matrix4().makeRotationY(pivot.rotation.y);
    const corners = fitPoints.map(point => point.clone().applyMatrix4(rotation));
    const projected = new THREE.Vector3();
    let low = 3, high = 18;
    for (let i = 0; i < 12; i++) {
      const distance = (low + high) / 2;
      camera.position.set(0, 1.15 + distance * .025, distance);
      camera.lookAt(0, .66, 0); camera.updateMatrixWorld();
      const fits = corners.every(point => {
        const p = projected.copy(point).project(camera);
        return Math.abs(p.x) < .90 && Math.abs(p.y) < .86;
      });
      if (fits) high = distance; else low = distance;
    }
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w; height = h;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.updateProjectionMatrix(); fitCamera(); draw();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; draw(); });
  observer.observe(container);
  document.addEventListener('visibilitychange', draw);
  const loseContext = event => { event.preventDefault(); onContextLost?.(); dispose(); };
  renderer.domElement.addEventListener('webglcontextlost', loseContext);
  function dispose() {
    if (disposed) return;
    disposed = true;
    resizeObserver.disconnect(); observer.disconnect();
    document.removeEventListener('visibilitychange', draw);
    renderer.domElement.removeEventListener('webglcontextlost', loseContext);
    signal?.removeEventListener('abort', dispose);
    pivot.traverse(object => object.geometry?.dispose());
    for (const material of materials) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    }
    textures.forEach(texture => texture.dispose());
    environment.dispose(); draco.dispose(); renderer.dispose(); renderer.domElement.remove();
  }
  signal?.addEventListener('abort', dispose, { once: true });
  try {
    const gltf = await loader.loadAsync(config.src, event => onProgress?.(event.loaded, event.total));
    pivot.add(gltf.scene);
    if (signal?.aborted || disposed) {
      gltf.scene.traverse(object => {
        object.geometry?.dispose();
        for (const m of [object.material].flat().filter(Boolean)) {
          for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
          m.dispose();
        }
      });
      throw new DOMException('Loading cancelled', 'AbortError');
    }
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const scale = 5 / box.getSize(new THREE.Vector3()).z;
    gltf.scene.scale.multiplyScalar(scale);
    gltf.scene.position.sub(new THREE.Vector3(center.x, box.min.y, center.z).multiplyScalar(scale));
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(object => {
      const positions = object.geometry?.attributes.position;
      if (!positions) return;
      const step = Math.max(1, Math.floor(positions.count / 96));
      for (let i = 0; i < positions.count; i += step)
        fitPoints.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
    });
    // Fine flakes sit below a smooth coat; the environment supplies the paint's gradient.
    const flakes = canvasTexture((ctx, size) => {
      const data = ctx.createImageData(size, size);
      let seed = 29;
      const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < data.data.length; i += 4) {
        const strength = random() > .94 ? 26 : 3;
        data.data.set([128 + (random() - .5) * strength, 128 + (random() - .5) * strength, 255, 255], i);
      }
      ctx.putImageData(data, 0, 0);
    }, 256);
    flakes.wrapS = flakes.wrapT = THREE.RepeatWrapping; flakes.repeat.set(30, 30);
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      if (object.material?.name === config.headlightMaterial) {
        materials.add(object.material);
        object.material = ledMaterial;
        object.renderOrder = 10;
        object.frustumCulled = false;
        opticalGuides.push(object);
      }
      for (const material of [object.material].flat()) {
        if (materials.has(material)) continue;
        materials.add(material);
        if (material.name === config.paintMaterial) {
          material.metalness = .18; material.roughness = .24;
          material.clearcoat = 1; material.clearcoatRoughness = .055;
          material.normalMap = flakes; material.normalScale.set(.18, .18);
        }
        if (/clear headlamp|smoked automotive glass|ruby tail lamp/.test(material.name)) {
          // Thin covers preserve the optics without an expensive transmission pass.
          material.transmission = 0; material.transparent = true;
          material.opacity = /smoked/.test(material.name) ? .48 : .13;
          material.depthWrite = false; material.roughness = .08;
          material.side = THREE.FrontSide;
          if (/smoked/.test(material.name)) {
            material.color.setRGB(.012, .020, .022); material.opacity = .92;
            material.roughness = .13; material.envMapIntensity = .65;
          } else if (/headlamp/.test(material.name)) {
            material.color.setRGB(.02, .035, .045); material.opacity = .12;
          }
        }
        if (/Interior/.test(material.name)) material.color.setRGB(.16, .16, .16);
        if (/LightA_Material/.test(material.name)) {
          material.color.setRGB(.06, .07, .08); material.roughness = .2;
        }
        if (material.name === 'GT3_TaillightLED') {
          material.toneMapped = false; material.emissiveIntensity = 1.3;
        }
      }
    });
    // Replace sub-pixel prism ribs with eight continuous guides at their original centers.
    for (const source of opticalGuides) {
      const bounds = new THREE.Box3().setFromObject(source), mid = bounds.getCenter(new THREE.Vector3());
      const groups = new Map(), position = source.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(source.matrixWorld);
        const key = `${point.x > mid.x}-${point.y > mid.y}`;
        if (!groups.has(key)) groups.set(key, { sum: new THREE.Vector3(), count: 0 });
        const group = groups.get(key); group.sum.add(point); group.count++;
      }
      source.visible = false;
      for (const group of groups.values()) {
        const guide = new THREE.Mesh(new THREE.BoxGeometry(.040 * scale, .009 * scale, .002 * scale), ledMaterial);
        guide.position.copy(group.sum.divideScalar(group.count));
        guide.renderOrder = 10; pivot.add(guide);
      }
    }
    const glowTexture = canvasTexture((ctx, size) => {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(205,236,255,.85)'); g.addColorStop(.15, 'rgba(118,202,255,.35)');
      g.addColorStop(.45, 'rgba(85,158,255,.06)'); g.addColorStop(1, 'rgba(50,130,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    });
    for (const x of [-.697, .697]) {
      const material = new THREE.SpriteMaterial({ map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false });
      materials.add(material);
      const glow = new THREE.Sprite(material);
      glow.position.set((x - center.x) * scale, (.70 - box.min.y) * scale, (1.80 - center.z) * scale);
      glow.scale.set(.85, .48, 1); glow.visible = false; glow.renderOrder = 11;
      pivot.add(glow); glows.push(glow);
    }
    const shadowTexture = canvasTexture((ctx, size) => {
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, 'rgba(0,0,0,.75)');
      gradient.addColorStop(.55, 'rgba(0,0,0,.5)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0,0,size,size);
    });
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    materials.add(shadowMaterial);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 6.1), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.015;
    pivot.add(shadow);
    loaded = true; resize(); fitCamera();
    await renderer.compileAsync(scene, camera);
    if (disposed) throw new DOMException('Loading cancelled', 'AbortError');
    draw();
  } catch (error) { dispose(); throw error; }
  return {
    setProgress(value) { pivot.rotation.y = (config.rotationY || 0) - value * Math.PI * .78; fitCamera(); draw(); },
    setLights(value) {
      ledMaterial.color.setRGB(.015 + value * 1.8, .02 + value * 2.6, .025 + value * 3.5);
      ledMaterial.opacity = value;
      container.dataset.lights = value.toFixed(3);
      for (const glow of glows) { glow.visible = value > 0; glow.material.opacity = value; }
      draw();
    },
    setActive(value) { active = value; if (value) { resize(); draw(); } },
    snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    dispose,
  };
}
