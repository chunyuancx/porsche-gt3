const sequence=document.querySelector('.sequence');
const frame=document.querySelector('#car-frame');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(max-width:700px)');
let queued=false,viewer=null,progress=0;
const clamp=v=>Math.min(1,Math.max(0,v));
function update(){queued=false;const distance=sequence.offsetHeight-innerHeight;progress=reduced.matches?0:clamp(-sequence.getBoundingClientRect().top/Math.max(1,distance));const p=progress*progress*(3-2*progress);frame.style.transform=mobile.matches?`translateY(${p*innerHeight*.16}px) scale(${1-p*.2})`:`translate(${p*innerWidth*.23}px,${p*innerHeight*.05}px) scale(${1-p*.43})`;document.querySelector('.hero-type').style.opacity=1-clamp(p*2);document.querySelector('.hero-copy').style.opacity=1-clamp(p*3);document.querySelector('.hero-copy').style.visibility=p>.4?'hidden':'visible';document.querySelector('.motion-note').style.opacity=1-clamp(p*3);document.querySelector('.scroll-cue').style.opacity=1-clamp(p*3);document.querySelector('.settled-copy').style.opacity=clamp((p-.4)/.4);viewer?.setProgress(p);}
function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduced.addEventListener('change',schedule);update();
// No model request or WebGL bundle download until an actual asset is configured.
fetch('./assets/model.json').then(r=>{if(!r.ok)throw Error('No model configuration');return r.json();}).then(async config=>{if(!config.src||reduced.matches||navigator.connection?.saveData)return;try{const {createViewer}=await import('./viewer.js');viewer=await createViewer(document.querySelector('#viewer'),config);document.querySelector('#poster').style.visibility='hidden';document.querySelector('#asset-status').textContent='Scroll to explore every angle';schedule();}catch(error){console.warn('Using the photographic fallback.',error);}}).catch(()=>{});
