import {readFileSync,existsSync,statSync} from 'node:fs';
import {join,dirname} from 'node:path';
const html=readFileSync('dist/index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 const ref=match[1];
 if(ref.startsWith('#')||ref.startsWith('http'))continue;
 const path=ref.startsWith('/')?join('dist',ref):join(dirname('dist/index.html'),ref);
 if(!existsSync(path))throw Error('Missing asset: '+ref);
}
for(const path of ['dist/vendor/three.core.js','dist/vendor/three.module.js','dist/vendor/addons/loaders/GLTFLoader.js','dist/vendor/addons/utils/BufferGeometryUtils.js'])if(!existsSync(path))throw Error(path);
const photo=readFileSync('dist/assets/gt3.jpg');if(photo[0]!==255||photo[1]!==216)throw Error('Invalid JPEG');
console.log('Local asset references valid. JPEG: '+statSync('dist/assets/gt3.jpg').size+' bytes.');
const config=JSON.parse(readFileSync('dist/assets/model.json','utf8'));
const model=readFileSync(join('dist',config.src));
if(model.toString('ascii',0,4)!=='glTF'||model.readUInt32LE(4)!==2||model.readUInt32LE(8)!==model.length)throw Error('Invalid GLB');
const gltf=JSON.parse(model.subarray(20,20+model.readUInt32LE(12)).toString());
for(const name of [config.paintMaterial,config.headlightMaterial])if(!gltf.materials.some(m=>m.name===name))throw Error('Missing material '+name);
if(!gltf.extensionsUsed.includes('KHR_draco_mesh_compression'))throw Error('Expected compressed model');
for(const path of ['dist/vendor/addons/loaders/DRACOLoader.js','dist/vendor/addons/environments/RoomEnvironment.js','dist/vendor/draco/draco_wasm_wrapper.js','dist/vendor/draco/draco_decoder.wasm','dist/vendor/draco/draco_decoder.js'])if(!existsSync(path))throw Error('Missing local decoder '+path);
const poster=readFileSync('dist/assets/gt3-poster.png');
if(poster.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Invalid PNG poster');
console.log(`GLB valid: ${model.length} bytes; paint and headlight materials present; local decoder and PNG poster verified.`);
