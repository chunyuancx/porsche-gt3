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
