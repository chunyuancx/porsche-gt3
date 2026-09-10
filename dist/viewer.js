import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function createViewer(container,config){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:innerWidth>700,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.75));renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(6,2.5,7);camera.lookAt(0,.3,0);scene.add(new THREE.HemisphereLight(0xf6f7e9,0x3f4540,3));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0xe7efa4,2);rim.position.set(-4,2,-3);scene.add(rim);
 let visible=true,loaded=false,p=0,lost=false;const pivot=new THREE.Group();scene.add(pivot);
 function draw(){if(visible&&loaded&&!lost&&!document.hidden)renderer.render(scene,camera);}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;draw();});observer.observe(container);document.addEventListener('visibilitychange',draw);
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;document.querySelector('#poster').style.visibility='visible';});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;document.querySelector('#poster').style.visibility='hidden';draw();});
 try{const gltf=await new GLTFLoader().loadAsync(config.src);const model=gltf.scene;const box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const scale=5/Math.max(size.x,size.y,size.z);model.position.copy(center).multiplyScalar(-scale);model.scale.setScalar(scale);pivot.add(model);loaded=true;resize();}catch(error){resizeObserver.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',draw);renderer.dispose();renderer.domElement.remove();throw error;}
 return{setProgress(value){p=value;pivot.rotation.y=(config.rotationY||0)+p*Math.PI*1.5;draw();}};
}
