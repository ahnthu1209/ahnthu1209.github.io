import {createPanoramaView} from './panorama.js?v=3';
import {createProjectedLight, projectionGLSL} from './projected-light.js';

const node = id => document.getElementById(id);
const stage = node('stage');
const viewport = node('view');
const enter = node('enter');
const status = node('status');
const play = node('play');
const progress = node('progress');
const time = node('time');
const fullscreen = node('fullscreen');
const spots = [...document.querySelectorAll('[data-spot]')];
const duration = 10_000;

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
  const response = await fetch('./phong-toi-3d.bin');
  if (!response.ok || !response.body) throw new Error('3D model could not be loaded');
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  const data = await new Response(stream).arrayBuffer();
  const size = new DataView(data).getUint32(0, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 4, size)));
  const bytes = new Uint8Array(data, 4 + size);
  return {meta, bytes};
}

const vertexShader = `
  varying vec3 surface;
  varying vec3 location;
  varying vec3 irradiance;
  varying vec2 texturePoint;
  void main() {
    surface = mat3(modelMatrix) * normal;
    location = (modelMatrix * vec4(position, 1.0)).xyz;
    irradiance = color;
    texturePoint = uv;
    gl_Position = projectionMatrix * viewMatrix * vec4(location, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 baseColor;
  uniform float metallic;
  uniform float roughnessLevel;
  uniform bool glowing;
  uniform bool water;
  uniform bool hasImage;
  uniform sampler2D imageMap;
  varying vec3 surface;
  varying vec3 location;
  varying vec3 irradiance;
  varying vec2 texturePoint;

  float grain(vec3 p) {
    return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);
  }

  ${projectionGLSL}
  void main() {
    vec3 diffuse = hasImage ? texture2D(imageMap, texturePoint).rgb : baseColor;
    vec3 n = normalize(surface) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 eye = normalize(cameraPosition-location);
    vec3 color = diffuse * irradiance * 1.32;
    if (glowing) color = 0.8 + baseColor * 0.45;
    if (!glowing && !hasImage) {
      float fineGrain = grain(floor(location*370.0));
      color *= mix(.87, 1.13, fineGrain);
      float grazed = pow(1.0-max(0.0,dot(n,eye)), 3.2);
      float lift = max(0.0,dot(n, normalize(vec3(-.36,.75,.24))));
      float lamp = pow(max(0.0,dot(n, normalize(normalize(vec3(1.18-location.x,1.87-location.y,.05-location.z))+eye))), mix(90.,12.,roughnessLevel));
      float metalReflection = (.010+lift*.023+grazed*.030+lamp*.19)*metallic;
      color += vec3(1.0,.86,.64)*(metalReflection+lamp*.028*(1.0-roughnessLevel));
      if (water) {
        color *= .29;
        color += vec3(.30,.23,.13)*(lamp*.41 + grazed*.075 + fineGrain*.034);
      }
    }
    vec4 matched = sceneGrade(n,location);
    float strength = matched.a * (hasImage ? .91 : 1.);
    color = mix(color,matched.rgb,strength);
    gl_FragColor = vec4(color,water ? mix(.43,1.,strength) : 1.0);
    #include <colorspace_fragment>
  }
`;

function typed(data, Type) {
  return new Type(data.buffer.slice(data.byteOffset, data.byteOffset+data.byteLength));
}

function updateButton(active) {
  spots.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.spot === active)));
}

async function createWebGLView(canvas,context) {
    const [THREE, model] = await Promise.all([importThree(), fetchScene()]);
    const renderer = new THREE.WebGLRenderer({canvas,context,antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.debug.onShaderError=(gl,program,vertex,fragment) => {
      throw new Error(gl.getProgramInfoLog(program) || gl.getShaderInfoLog(fragment) || gl.getShaderInfoLog(vertex));
    };
    const scene = new THREE.Scene();
    let refreshLight=()=>{};
    const projected=await createProjectedLight(THREE,()=>refreshLight());
    scene.background = new THREE.Color('#18140f');
    const camera = new THREE.PerspectiveCamera(57, 1, .044, 24);
    const {meta, bytes} = model;
    const part = ([offset, length]) => bytes.subarray(offset, offset + length);
    const textures = new Map();
    await Promise.all(Object.entries(meta.textures).map(async ([name, range]) => {
      const bitmap = await createImageBitmap(new Blob([part(range)], {type:'image/jpeg'}), {imageOrientation:'flipY'});
      const texture = new THREE.Texture(bitmap);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
      textures.set(name, texture);
    }));

    for (const item of meta.groups) {
      const geometry = new THREE.BufferGeometry();
      const raw = typed(part(item.positions), Int16Array);
      const positions = Float32Array.from(raw, value => value/7000);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(typed(part(item.normals), Int8Array), 3, true));
      geometry.setAttribute('color', new THREE.BufferAttribute(part(item.colors), 3, true));
      if (item.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(typed(part(item.uv), Uint16Array), 2, true));
      geometry.setIndex(new THREE.BufferAttribute(typed(part(item.indices), item.index32 ? Uint32Array : Uint16Array), 1));
      const material = new THREE.ShaderMaterial({
        uniforms: {
          ...projected.uniforms,
          baseColor: {value: new THREE.Color(...item.rgb)},
          metallic: {value:item.metal}, roughnessLevel: {value:item.rough},
          glowing: {value:item.glow}, water: {value:item.water},
          hasImage: {value:Boolean(item.texture)}, imageMap: {value:textures.get(item.texture) ?? null},
        },
        vertexShader, fragmentShader,
        vertexColors: true,
        transparent: item.water,
        depthWrite: !item.water,
        side: item.texture || item.water ? THREE.DoubleSide : THREE.FrontSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      if (item.water) mesh.renderOrder = 1;
      scene.add(mesh);
    }

    const up = new THREE.Vector3(0,1,0);
    const target = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const previous = new THREE.Vector3();
    const next = new THREE.Vector3();
    let lastView;
    function draw(view) {
      lastView=view;
      const {active,value,yaw,pitch}=view;
      const {width,height}=viewport.getBoundingClientRect();
      if (!width || !height) return;
      const aspect = width/height;
      if (camera.aspect!==aspect || renderer.domElement.clientWidth!==width || 
          renderer.domElement.width!==Math.floor(width*renderer.getPixelRatio())) {
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
        const frameWidth = projected.hero?.field[0] ?? .8571429;
        angle = camera.aspect < 1 ? 71 : THREE.MathUtils.radToDeg(2*Math.atan(frameWidth/camera.aspect));
      }
      camera.fov = angle + (camera.aspect < .95 && active && active !== 'entry' ? 12 : 0);
      camera.updateProjectionMatrix();
      direction.applyAxisAngle(up,active === 'entry' ? Math.max(-.93,Math.min(.93,yaw)) : yaw);
      const heading = Math.atan2(direction.x,-direction.z);
      const tilt = Math.max(-1.2,Math.min(1.2,Math.asin(direction.y)+pitch));
      direction.set(Math.sin(heading)*Math.cos(tilt),Math.sin(tilt),-Math.cos(heading)*Math.cos(tilt));
      camera.lookAt(target.copy(camera.position).add(direction));
      projected.select(active,value,camera.position);
      renderer.render(scene,camera);
    }

    const initial={active:'entry',value:0,yaw:0,pitch:0};
    draw(initial);
    refreshLight=()=>draw(lastView??initial);
    return {element:renderer.domElement, mode:'3d', draw};
}

async function start() {
  enter.disabled = true;
  status.textContent = 'Đang tải mô hình 3D…';
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
    if (display.mode==='panorama') {
      node('hint').textContent='Chế độ 360° · Kéo để nhìn quanh. Chọn một góc nhìn hoặc phát hành trình.';
    }
    let value = 0;
    let yaw = 0;
    let pitch = 0;
    let active = 'entry';
    let playing = false;
    let raf = 0;
    let startAt = 0;
    let pointer = null;
    function formatTime(fraction) {
      return `0:${String(Math.min(10,Math.floor(fraction * 10))).padStart(2,'0')} / 0:10`;
    }

    function draw() { display.draw({active,value,yaw,pitch}); }
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
      if (playing) { stop(); return; }
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
        stop();
        active = button.dataset.spot;
        updateButton(active);
        yaw = pitch = 0;
        if (active === 'entry') setValue(0);
        draw();
      });
    }
    viewport.addEventListener('pointerdown', event => {
      if (pointer || event.button !== 0) return;
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
    if (stage.requestFullscreen && document.fullscreenEnabled) {
      fullscreen.hidden = false;
      fullscreen.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await stage.requestFullscreen();
        } catch (error) { console.warn('Fullscreen unavailable',error); }
      });
      document.addEventListener('fullscreenchange', () => {
        fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Thoát toàn màn hình' : 'Xem toàn màn hình');
      });
    }

    draw();
    stage.classList.add('ready');
    node('controls').hidden = false;
    node('hint').hidden = false;
    viewport.focus({preventScroll:true});
  } catch (error) {
    console.error(error);
    status.textContent = 'Chưa mở được mô hình 3D trên trình duyệt này. Bạn vẫn có thể xem ảnh toàn cảnh.';
    enter.textContent = 'Thử mở lại';
    enter.disabled = false;
  }
}
enter.addEventListener('click', start);
