import {enableAvatar} from './avatar.js?v=14';
import {createPrintScene} from './print-scene.js?v=11';
import {createPanoramaView} from './panorama.js?v=15';
import {vertexShader, fragmentShader} from './surfaces.js?v=6';

import {createOrientationControl} from './orientation.js?v=15';

const node = id => document.getElementById(id);
const stage = node('stage');
const viewport = node('view');
const enter = node('enter');
const status = node('status');
const gate = node('gate');
const gateLeaf = gate.querySelector('.gate-leaf');
const experience=gate.parentElement;
const play = node('play');
const progress = node('progress');
const time = node('time');
const fullscreen = node('fullscreen');
const spots = [...document.querySelectorAll('[data-spot]')];
const duration = 10_000;
const soundtrack = node('background-music');
const soundToggle = node('sound-toggle');
const mobile = matchMedia('(any-pointer: coarse)');

function playSoundtrack() {
  soundtrack.play().catch(()=>{});
}
function updateSoundToggle() {
  soundToggle.textContent = soundtrack.paused ? 'Bật nhạc' : 'Tắt nhạc';
  soundToggle.setAttribute('aria-label', soundtrack.paused ? 'Bật nhạc nền' : 'Tắt nhạc nền');
}
soundtrack.addEventListener('play',updateSoundToggle);
soundtrack.addEventListener('pause',updateSoundToggle);
soundToggle.addEventListener('click',()=>{
  if(soundtrack.paused) playSoundtrack();
  else soundtrack.pause();
});

const threeVersions = [
  'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.min.js',
  'https://unpkg.com/three@0.179.1/build/three.module.min.js',
];
async function importThree() {
  for (const url of threeVersions) {
    try { return await import(url); }
    catch (error) { console.warn('Could not load 3D engine', error); }
  }
  throw new Error('Three.js could not be loaded');
}

async function fetchScene() {
  const response = await fetch('./phong-toi-gallery.bin');
  if (!response.ok || !response.body) throw new Error('3D model could not be loaded');
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  const data = await new Response(stream).arrayBuffer();
  const size = new DataView(data).getUint32(0, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 4, size)));
  const bytes = new Uint8Array(data, 4 + size);
  return {meta, bytes};
}

function typed(data, Type) {
  return new Type(data.buffer.slice(data.byteOffset, data.byteOffset+data.byteLength));
}

function updateButton(active) {
  spots.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.spot === active)));
}

async function createWebGLView(canvas,context) {
    const [THREE, model, mapResponse] = await Promise.all([
      importThree(),fetchScene(),fetch('./be-mat-gallery.webp'),
    ]);
    if (!mapResponse.ok) throw new Error('Không tải được bề mặt của phòng');
    const renderer = new THREE.WebGLRenderer({canvas,context,antialias:true});
    renderer.setPixelRatio(Math.min(Math.max(1.2,window.devicePixelRatio || 1),1.75));
    renderer.debug.onShaderError=(gl,program,vertex,fragment) => {
      throw new Error(gl.getProgramInfoLog(program) || gl.getShaderInfoLog(fragment) || gl.getShaderInfoLog(vertex));
    };
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#18140f');
    const camera = new THREE.PerspectiveCamera(57,1,.044,24);
    const {meta, bytes} = model;
    const part = ([offset, length]) => bytes.subarray(offset,offset+length);

    async function unpackTexture(data) {
      const bitmap=await createImageBitmap(data,{imageOrientation:'flipY'});
      const texture=new THREE.Texture(bitmap);
      texture.flipY=false;
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate=true;
      return texture;
    }

    const surfaceMap=await unpackTexture(await mapResponse.blob());
    const textures=new Map();
    await Promise.all(Object.entries(meta.textures).map(async ([name,range]) => {
      textures.set(name,await unpackTexture(new Blob([part(range)],{type:'image/jpeg'})));
    }));

    await Promise.all(meta.groups.filter(item => item.photo).map(async item => {
      const response=await fetch('./anh-treo/'+item.photo);
      if (!response.ok) throw new Error('Không tải được ảnh treo '+item.photo);
      textures.set(item.photo,await unpackTexture(await response.blob()));
    }));

    for (const item of meta.groups) {
      const geometry=new THREE.BufferGeometry();
      const raw=typed(part(item.positions),Int16Array);
      geometry.setAttribute('position',new THREE.BufferAttribute(Float32Array.from(raw,value=>value/7000),3));
      geometry.setAttribute('normal',new THREE.BufferAttribute(typed(part(item.normals),Int8Array),3,true));
      if (item.bake) geometry.setAttribute('uv',new THREE.BufferAttribute(typed(part(item.bake),Uint16Array),2,true));
      if (item.source) geometry.setAttribute('sourceUV',new THREE.BufferAttribute(typed(part(item.source),Uint16Array),2,true));
      geometry.setIndex(new THREE.BufferAttribute(typed(part(item.indices),item.index32 ? Uint32Array : Uint16Array),1));
      const art = textures.get(item.texture);
      const material=new THREE.ShaderMaterial({
        uniforms:{
          baseColor:{value:new THREE.Color(...item.rgb)},
          isWater:{value:item.water},
          hasArtwork:{value:Boolean(art)},
          surfaceMap:{value:surfaceMap},
          artworkMap:{value:art??surfaceMap},
        },
        vertexShader, fragmentShader,
        transparent:item.water,
        depthWrite:!item.water,
        side:item.texture || item.water || item.name.startsWith('Giấy') ? THREE.DoubleSide : THREE.FrontSide,
        toneMapped:false,
      });
      material.defaultAttributeValues.sourceUV=[0,0];
      const mesh=new THREE.Mesh(geometry,material);
      if (item.water) mesh.renderOrder=1;
      scene.add(mesh);
    }

    const workshop=createPrintScene(THREE,scene);
    let instruction;
    const up = new THREE.Vector3(0,1,0);
    const target = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const previous = new THREE.Vector3();
    const next = new THREE.Vector3();
    function draw({active,value,yaw,pitch,orientation}) {
      const {width,height}=viewport.getBoundingClientRect();
      if (!width || !height) return;
      const aspect = width/height;
      const pixelRatio = orientation ? Math.min(1.25, window.devicePixelRatio || 1)
        : Math.min(Math.max(1.2, window.devicePixelRatio || 1),1.75);
      if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
      if (camera.aspect!==aspect || renderer.domElement.clientWidth!==width ||
          renderer.domElement.width!==Math.floor(width*pixelRatio)) {
        camera.aspect=aspect;
        renderer.setSize(width,height,false);
      }
      let angle;
      if (active === 'trays' || active === 'prints') {
        const p = meta.detail[active === 'trays' ? 0 : 1];
        camera.position.fromArray(p[0]);
        direction.fromArray(p[1]);
        angle = active === 'trays' ? 42 : 49;
      } else {
        const frame = value * (meta.tour.length-1);
        const i = Math.floor(frame);
        const j = Math.min(i+1,meta.tour.length-1);
        previous.fromArray(meta.tour[i][0]);
        next.fromArray(meta.tour[j][0]);
        camera.position.lerpVectors(previous, next, frame-i);
        previous.fromArray(meta.tour[i][1]);
        next.fromArray(meta.tour[j][1]);
        direction.lerpVectors(previous, next, frame-i).normalize();
        const frameWidth = meta.anchors[0].field[0];
        angle = camera.aspect < 1 ? 71 : THREE.MathUtils.radToDeg(2*Math.atan(frameWidth/camera.aspect));
      }
      camera.fov = angle + (camera.aspect < .95 && active && active !== 'entry' ? 12 : 0);
      camera.updateProjectionMatrix();
      direction.applyAxisAngle(up,active === 'entry' ? Math.max(-.93,Math.min(.93,yaw)) : yaw);
      const heading = Math.atan2(direction.x,-direction.z);
      const tilt = Math.max(-1.2,Math.min(1.2,Math.asin(direction.y)+pitch));
      direction.set(Math.sin(heading)*Math.cos(tilt),Math.sin(tilt),-Math.cos(heading)*Math.cos(tilt));
      if (orientation) camera.quaternion.copy(orientation);
      else camera.lookAt(target.copy(camera.position).add(direction));
      if(instruction) workshop.frame(instruction.phase,instruction.progress,camera,aspect<1);
      renderer.render(scene,camera);
    }

    const initial={active:'entry',value:0,yaw:0,pitch:0};
    draw(initial);
    return {
      element:renderer.domElement, mode:'3d', draw,
      orientationBasis:()=>camera.quaternion.clone(),
      workshop:{
        start:workshop.start, finish:workshop.finish,
        frame(phase,progress){instruction={phase,progress};},
        reset(){instruction=null;workshop.hide();},
      },
    };
}

async function start() {
  playSoundtrack();
  enter.disabled = true;
  // Prepare the scene before moving the gate so it never hangs half-open
  // while large 3D assets are still downloading.
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const notice=setTimeout(()=>{status.textContent='Đang chuẩn bị phòng 3D…';},650);
  try {
    const canvas=document.createElement('canvas');
    const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
    let display;
    if (context) {
      try { display=await createWebGLView(canvas,context); }
      catch (error) { console.warn('Đang chuyển sang chế độ 360°',error); }
    }
    if (!display) display=await createPanoramaView(viewport);
    viewport.replaceChildren(display.element);
    let value = 0;
    let yaw = 0;
    let pitch = 0;
    let active = 'entry';
    let playing = false;
    let raf = 0;
    let startAt = 0;
    let pointer = null;
    let runningPrint=false;
    let orientation = null;
    const vrControls = node('vr-controls');
    const vrToggle = node('vr-toggle');
    const recenter = node('vr-recenter');
    const vrStatus = node('vr-status');
    const vr = createOrientationControl({
      loadEngine:importThree,
      getBasis(Quaternion, Euler) {
        if (display.orientationBasis) return display.orientationBasis();
        const heading = active === 'entry' ? Math.max(-.93, Math.min(.93, yaw)) : yaw;
        const tilt = Math.max(-1.08, Math.min(1.08, pitch));
        return new Quaternion().setFromEuler(new Euler(tilt, heading, 0, 'YXZ'));
      },
      canStart:()=>mobile.matches && !runningPrint,
      onFrame(next) { orientation = next; draw(); },
      onState(state,message) {
        const active = state === 'active';
        const engaged = state !== 'off';
        if (engaged) {
          stop();
          if (pointer && viewport.hasPointerCapture(pointer.id)) viewport.releasePointerCapture(pointer.id);
          pointer = null;
        }
        for (const control of [...spots, play, progress]) control.disabled = engaged;
        vrToggle.textContent = state === 'pending' ? 'Hủy bật VR' : active ? 'Tắt VR' : 'Bật VR';
        vrToggle.setAttribute('aria-pressed', String(active));
        if (!active && document.activeElement === recenter) vrToggle.focus({preventScroll:true});
        recenter.hidden = !active;
        vrStatus.textContent = message;
        vrStatus.hidden = !message;
        experience.toggleAttribute('data-vr', active);
        if (!engaged) { orientation = null; draw(); }
      },
    });
    vrToggle.addEventListener('click',()=>vr.engaged ? vr.stop() : vr.start());
    recenter.addEventListener('click',vr.recenter);

    function formatTime(fraction) {
      return `0:${String(Math.min(10,Math.floor(fraction * 10))).padStart(2,'0')} / 0:10`;
    }

    function draw() { display.draw({active,value,yaw,pitch,orientation}); }
    new ResizeObserver(draw).observe(viewport);

    function setValue(nextValue) {
      value = Math.min(1,Math.max(nextValue,0));
      progress.value = Math.round(value*1000);
      time.textContent = formatTime(value);
    }

    function stop() {
      playing = false;
      cancelAnimationFrame(raf);
      play.textContent = 'Phát hành trình';
    }

    function tick(now) {
      if (!playing) return;
      setValue((now-startAt)/duration);
      draw();
      if (value >= 1) stop();
      else raf = requestAnimationFrame(tick);
    }

    function beginTour() {
      if (runningPrint || vr.engaged) return;
      if (playing) { stop(); return; }
      resetPrint();
      if (active === 'trays' || active === 'prints' || value >= 1) setValue(0);
      active = null;
      updateButton(null);
      yaw = pitch = 0;
      playing = true;
      play.textContent = 'Tạm dừng';
      startAt = performance.now() - duration*value;
      raf = requestAnimationFrame(tick);
    }

    function navigate(valueNext) {
      if(runningPrint||vr.engaged)return;
      resetPrint();
      stop();
      if (active === 'trays' || active === 'prints') yaw = pitch = 0;
      active = null;
      updateButton(null);
      setValue(valueNext);
      draw();
    }

    play.addEventListener('click', beginTour);
    progress.addEventListener('input', () => navigate(Number(progress.value)/1000));
    for (const button of spots) {
      button.addEventListener('click', () => {
        if(runningPrint||vr.engaged)return;
        resetPrint();
        stop();
        active = button.dataset.spot;
        updateButton(active);
        yaw = pitch = 0;
        if (active === 'entry') setValue(0);
        draw();
      });
    }
    viewport.addEventListener('pointerdown', event => {
      if (pointer || event.button !== 0 || runningPrint || vr.engaged) return;
      stop();
      pointer = {id:event.pointerId,x:event.clientX,y:event.clientY};
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      yaw += (event.clientX-pointer.x)*.004;
      pitch = Math.max(-1.12,Math.min(1.12,pitch+(event.clientY-pointer.y)*.004));
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      draw();
    });
    viewport.addEventListener('lostpointercapture', () => {pointer = null;});
    viewport.addEventListener('keydown', event => {
      if (runningPrint || vr.engaged) return;
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') spots[0].click();
      else if (event.key === 'ArrowUp') navigate(value+.065);
      else if (event.key === 'ArrowDown') navigate(value-.065);
      else {
        stop();
        yaw += event.key === 'ArrowLeft' ? .12 : -.12;
        draw();
      }
    });
    if (experience.requestFullscreen && document.fullscreenEnabled) {
      fullscreen.hidden = false;
      fullscreen.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await experience.requestFullscreen();
        } catch (error) { console.warn('Fullscreen unavailable',error); }
      });
      document.addEventListener('fullscreenchange', () => {
        fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Thoát toàn màn hình' : 'Xem toàn màn hình');
      });
    }

    const still=node('fallback-print');
    const clip=node('fallback-clip');
    const animation=(ms,callback)=>{
      return new Promise(resolve=>{
        const start=performance.now();
        const frame=now=>{
          const t=Math.min(1,(now-start)/ms);
          callback(reduced.matches?1:t);
          if(t===1)resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    };
    const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const setPosition=spot=>{
      active=spot;yaw=pitch=0;updateButton(spot);draw();
    };
    function resetPrint(){
      display.workshop?.reset();
      still.hidden=clip.hidden=true;
      still.removeAttribute('src');
    }
    function fallbackFrame(phase,t){
      const pan=phase==='dip'||phase==='lift';
      const landscape=stage.clientWidth/stage.clientHeight>=1;
      const blend=(a,b,k)=>a+(b-a)*k;
      const clamp=v=>Math.min(1,Math.max(v,0));
      const smooth=v=>v*v*(3-2*v);
      const d=pan?(phase==='dip'?smooth(clamp(t/.34)):1-smooth(t)):0;
      const k=pan?0:phase==='hang'?smooth(clamp(t/.61)):1;
      const w=landscape?(pan?22:19):(pan?34:32);
      const x=pan?57:landscape?53:50;
      const y=pan?blend(53,65,d):blend(62,48,k);
      const safe=pan?d:1-k;
      still.style.setProperty('--sheet-x',x+'%');
      still.style.setProperty('--sheet-y',y+'%');
      still.style.setProperty('--sheet-w',w+'%');
      still.style.setProperty('--sheet-roll',blend(1,-6,safe)+'deg');
      still.style.setProperty('--sheet-tilt',(pan?blend(38,67,d):blend(19,0,k))+'deg');
      const topMeasure=Math.min(32,w*stage.clientWidth/stage.clientHeight)*.47;
      clip.hidden=pan||k<.78;
      clip.style.setProperty('--sheet-x',x+'%');
      clip.style.setProperty('--clip-y',Math.max(14,y-topMeasure)+'%');
    }
    const director={
      async wash(ghost,cue){
        vr.stop();
        stop();runningPrint=true;
        stage.classList.add('washing');
        experience.dataset.washing='';
        try {
          if(display.workshop)display.workshop.start(ghost);
          else {still.src=ghost.toDataURL();still.hidden=false;}
          setPosition('trays');
          cue('Đang tráng ảnh');
          const animate=(phase,ms)=>animation(ms,t=>{
            if(display.workshop){display.workshop.frame(phase,t);draw();}
            else fallbackFrame(phase,t);
          });
          await animate('dip',3000);
          cue('Đang nhấc ảnh khỏi khay');
          await animate('lift',1000);
          setPosition('prints');
          cue('Đang kẹp ảnh lên dây');
          await animate('hang',1750);
          cue('Chờ ảnh hiện màu');
          await pause(2100);
        } catch (e){
          runningPrint=false;
          stage.classList.remove('washing');delete experience.dataset.washing;
          throw e;
        }
      },
      async reveal(portrait){
        vr.stop();
        setPosition('prints');
        try {
          if(display.workshop){
            display.workshop.finish(portrait);
            await animation(1000,value=>{
              display.workshop.frame('reveal',value);draw();
            });
          } else {
            still.hidden=false;
            still.src=portrait.toDataURL();
            fallbackFrame('reveal',1);
            if(!reduced.matches)still.animate([{opacity:.3},{opacity:1}],{duration:1000});
            await pause(1000);
          }
        } finally {
          runningPrint=false;stage.classList.remove('washing');delete experience.dataset.washing;
        }
      },
      reset(){vr.stop();runningPrint=false;stage.classList.remove('washing');delete experience.dataset.washing;resetPrint();setPosition('entry');},
      unlock(){runningPrint=false;stage.classList.remove('washing');delete experience.dataset.washing;},
    };
    draw();
    stage.classList.add('ready');
    clearTimeout(notice);
    status.textContent='';
    // Flush the closed transform before revealing the animated door layer.
    getComputedStyle(gateLeaf).transform;
    gate.classList.add('opening');
    getComputedStyle(gateLeaf).transform;
    await Promise.allSettled(gateLeaf.getAnimations().map(animation=>animation.finished));
    gate.classList.add('passing');
    getComputedStyle(gate).opacity;
    await Promise.allSettled(gate.getAnimations({subtree:true}).map(animation=>animation.finished));
    gate.hidden=true;
    viewport.inert=false;
    node('controls').hidden=false;
    node('experience-tools').hidden=false;
    vrControls.hidden=!mobile.matches;
    enableAvatar(director);
    node('portrait-file').focus({preventScroll:true});
  } catch (error) {
    console.error(error);
    soundtrack.pause();
    clearTimeout(notice);
    gate.classList.remove('opening','passing');
    status.textContent = 'Chưa mở được mô hình 3D trên trình duyệt này. Bạn vẫn có thể xem ảnh toàn cảnh.';
    enter.querySelector('span').textContent='Thử mở lại';
    enter.disabled = false;
  }
}
enter.addEventListener('click', start);
