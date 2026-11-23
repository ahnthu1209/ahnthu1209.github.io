const walk = ['entree','allee-a','allee-b','allee-c','allee-d','allee-e','allee-f'];

export const projectionGLSL = `
  uniform sampler2D scenePhotoA;
  uniform sampler2D sceneDepthA;
  uniform sampler2D scenePhotoB;
  uniform sampler2D sceneDepthB;
  uniform vec3 sceneOrigin[2];
  uniform vec3 sceneRight[2];
  uniform vec3 sceneUp[2];
  uniform vec3 sceneForward[2];
  uniform vec2 sceneField[2];
  uniform vec2 sceneStrength;
  uniform float sceneBlend;

  vec4 renderColor(int i, sampler2D photo, sampler2D depth, vec3 normal, vec3 point) {
    if (sceneStrength[i] < .001) return vec4(0.);
    vec3 ray = point - sceneOrigin[i];
    float meters = length(ray);
    if (meters < .03) return vec4(0.);
    vec3 direct = ray / meters;
    vec3 local = vec3(dot(direct, sceneRight[i]), dot(direct, sceneUp[i]), dot(direct, sceneForward[i]));
    vec2 uv;
    float border = 1.;
    if (sceneField[i].x > .01) {
      if (local.z <= 0.) return vec4(0.);
      uv = local.xy / (2. * local.z * sceneField[i]) + .5;
      vec2 margin = min(uv,1.-uv);
      border = smoothstep(0.,.035,min(margin.x,margin.y));
    } else {
      uv = vec2(fract(atan(local.x,local.z) / 6.283185307 + .5),
                asin(clamp(local.y,-1.,1.)) / 3.141592654 + .5);
    }
    if (border <= 0.) return vec4(0.);
    float encoded = texture2D(depth,vec2(uv.x,1.-uv.y)).r;
    float tolerance = clamp(meters*.023,.032,.13);
    float depthMatch = 1. - smoothstep(.45*tolerance,tolerance,abs(encoded-meters));
    float facing = smoothstep(.04,.27,dot(normal,-direct));
    float match = border * depthMatch * facing * sceneStrength[i];
    return vec4(texture2D(photo,uv).rgb,match);
  }

  vec4 sceneGrade(vec3 normal, vec3 point) {
    vec4 a = renderColor(0,scenePhotoA,sceneDepthA,normal,point);
    vec4 b = renderColor(1,scenePhotoB,sceneDepthB,normal,point);
    float share = clamp(sceneBlend + .87*(b.a-a.a),0.,1.);
    float first = a.a*(1.-share);
    float second = b.a*share;
    float sum = first+second;
    vec3 result = (a.rgb*first+b.rgb*second)/max(.0001,sum);
    return vec4(result,max(a.a,b.a));
  }
`;

async function readDepth() {
  const response = await fetch('./anh-sang.bin?v=3');
  if (!response.ok || !response.body) throw new Error('Không tải được bản đồ ánh sáng');
  const data = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const end = 4 + new DataView(data).getUint32(0,true);
  const cameras = JSON.parse(new TextDecoder().decode(new Uint8Array(data,4,end-4)));
  return {cameras, data, start:end};
}

async function readPhoto(THREE,name) {
  const path = name === 'hero' ? './phong-toi.webp' : './panorama/'+name+'.webp';
  const response = await fetch(path);
  if (!response.ok) throw new Error('Không tải được ảnh '+name);
  const image = await createImageBitmap(await response.blob(),{imageOrientation:'flipY'});
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export async function createProjectedLight(THREE,onChange) {
  const placeholder = new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);
  placeholder.needsUpdate = true;
  const uniforms={
    scenePhotoA:{value:placeholder}, sceneDepthA:{value:placeholder},
    scenePhotoB:{value:placeholder}, sceneDepthB:{value:placeholder},
    sceneOrigin:{value:[new THREE.Vector3(),new THREE.Vector3()]},
    sceneRight:{value:[new THREE.Vector3(),new THREE.Vector3()]},
    sceneUp:{value:[new THREE.Vector3(),new THREE.Vector3()]},
    sceneForward:{value:[new THREE.Vector3(),new THREE.Vector3()]},
    sceneField:{value:[new THREE.Vector2(),new THREE.Vector2()]},
    sceneStrength:{value:new THREE.Vector2()},
    sceneBlend:{value:0},
  };
  const ready=new Map();
  const load = readDepth().then(({cameras,data,start}) => {
    const register=async camera => {
      const photo=await readPhoto(THREE,camera.name);
      const bytes = new DataView(data,start+camera.offset,camera.width*camera.height*2);
      const distances=new Float32Array(camera.width*camera.height);
      for(let i=0;i<distances.length;i++) distances[i]=bytes.getUint16(i*2,true)/4096;
      const depth=new THREE.DataTexture(distances,camera.width,camera.height,THREE.RedFormat,THREE.FloatType);
      depth.generateMipmaps=false;
      depth.needsUpdate=true;
      ready.set(camera.name,{...camera,photo,depth});
    };
    const priority=cameras.filter(camera=>camera.name==='hero'||camera.name==='entree');
    for (const camera of cameras.filter(camera=>!priority.includes(camera))) {
      register(camera).then(onChange).catch(error=>console.warn(error));
    }
    return Promise.allSettled(priority.map(register));
  });
  try { await load; }
  catch(error) { console.warn(error); }

  function assign(projection,index,standing) {
    const strength=uniforms.sceneStrength.value;
    strength.setComponent(index,0);
    if (!projection) return;
    const id=index===0?'A':'B';
    uniforms['scenePhoto'+id].value=projection.photo;
    uniforms['sceneDepth'+id].value=projection.depth;
    const origin=uniforms.sceneOrigin.value[index].fromArray(projection.origin);
    uniforms.sceneRight.value[index].fromArray(projection.right);
    uniforms.sceneUp.value[index].fromArray(projection.up);
    uniforms.sceneForward.value[index].fromArray(projection.forward);
    uniforms.sceneField.value[index].fromArray(projection.field);
    strength.setComponent(index,1-THREE.MathUtils.smoothstep(origin.distanceTo(standing),.68,2));
  }

  return {
    uniforms,
    hero:ready.get('hero'),
    select(active,value,position) {
      const slot=value*(walk.length-1);
      let first,second,mix=0;
      if (active==='trays'||active==='prints') {
        first=active==='trays'?'bacs':'tirages';
        second=active==='trays'?'allee-b':'allee-e';
      } else if (slot<.07) {
        first='hero';
        second='entree';
      } else {
        first=walk[Math.floor(slot)];
        second=walk[Math.min(walk.length-1,Math.ceil(slot))];
        mix=slot-Math.floor(slot);
      }
      assign(ready.get(first),0,position);
      assign(ready.get(second),1,position);
      uniforms.sceneBlend.value=mix;
    }
  };
}
