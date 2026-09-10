import {readFileSync,existsSync,statSync} from 'node:fs';
const html=readFileSync('dist/index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="(\/[^\"]*)"/g)){if(!existsSync('dist'+match[1]))throw Error('Missing asset: '+match[1]);}
for(const path of ['dist/vendor/three.core.js','dist/vendor/three.module.js','dist/vendor/addons/loaders/GLTFLoader.js','dist/vendor/addons/utils/BufferGeometryUtils.js'])if(!existsSync(path))throw Error(path);
const photo=readFileSync('dist/assets/gt3.jpg');if(photo[0]!==255||photo[1]!==216)throw Error('Invalid JPEG');
console.log('Local asset references valid. JPEG: '+statSync('dist/assets/gt3.jpg').size+' bytes.');
