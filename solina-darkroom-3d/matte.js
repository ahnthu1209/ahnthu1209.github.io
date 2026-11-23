const enginePath = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
const modelPath = 'https://huggingface.co/Xenova/modnet/resolve/fa2fa546052fba4c08921230a26cc69a333fca12/onnx/model_quantized.onnx';
let session;

async function loadSession(loadScript) {
  if (!globalThis.ort) await loadScript('./bo-anh/ort-wasm-1.20.1.js');
  const {ort}=globalThis;
  ort.env.wasm.numThreads=1;
  ort.env.wasm.wasmPaths=enginePath;
  const data=await fetch(modelPath,{signal:AbortSignal.timeout(22000)});
  if(!data.ok) throw new Error('Chưa tải được mô hình tách nền.');
  return ort.InferenceSession.create(await data.arrayBuffer(),{executionProviders:['wasm']});
}

export async function portraitMask(surface,loadScript) {
  session??=loadSession(loadScript).catch(error=>{session=undefined;throw error;});
  const net=await session;
  const scale=Math.min(512/Math.min(surface.width,surface.height),768/Math.max(surface.width,surface.height));
  const step=n=>Math.max(64,Math.round(n*scale/32)*32);
  const width=step(surface.width),height=step(surface.height),length=width*height;
  const sample=Object.assign(document.createElement('canvas'),{width,height});
  const ctx=sample.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(surface,0,0,width,height);
  const rgb=ctx.getImageData(0,0,width,height).data;
  const channels=new Float32Array(length*3);
  for(let i=0;i<length;i++){
    channels[i]=rgb[i*4]/127.5-1;
    channels[i+length]=rgb[i*4+1]/127.5-1;
    channels[i+2*length]=rgb[i*4+2]/127.5-1;
  }
  const input=new globalThis.ort.Tensor('float32',channels,[1,3,height,width]);
  let output;
  try {
    const result=await net.run({input});
    output=result.output;
    const alpha=new Float32Array(output.data);
    // Do not subtract pixels based on green hues: clothing, skin shadows and
    // reflected light must never be mistaken for background foliage.
    return {width,height,alpha};
  } finally {
    input.dispose();
    output?.dispose();
  }
}

// Keep multiple people and lightly feather silhouettes instead of eroding the
// mask down to a single hard-confidence core.  The old approach removed legs,
// thin clothing and the second person in couple portraits.
export function refineAlpha(alpha,width,height) {
  const size=width*height;
  const threshold=.14;
  const labels=new Int32Array(size);
  const queue=new Int32Array(size);
  const components=[];
  for(let i=0;i<size;i++){
    if(labels[i]||alpha[i]<threshold)continue;
    const label=components.length+1;
    let read=0,write=1,strong=0;
    queue[0]=i; labels[i]=label;
    while(read<write){
      const at=queue[read++],x=at%width;
      if(alpha[at]>.54)strong++;
      const y=(at-x)/width;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=x+dx,ny=y+dy;
        if(nx<0||nx>=width||ny<0||ny>=height)continue;
        const j=ny*width+nx;
        if(!labels[j]&&alpha[j]>=threshold){
          labels[j]=label;queue[write++]=j;
        }
      }
    }
    components.push({label,count:write,strong});
  }
  components.sort((a,b)=>b.count-a.count);
  if(!components.length||components[0].count<size*.005)
    throw new Error('Chưa tìm thấy chân dung rõ.');
  const primary=components[0].count;
  // Keep smaller foreground components such as separate hands or shoes.
  const allowed=new Uint8Array(components.length+1);
  let kept=0;
  for(const part of components){
    if(part.count<Math.max(12,size*.00015,primary*.005))break;
    if(part.strong<Math.max(6,part.count*.035))continue;
    allowed[part.label]=1;kept++;
  }
  if(!kept)allowed[components[0].label]=1;
  const clean=new Float32Array(size);
  for(let i=0;i<size;i++){
    if(!allowed[labels[i]])continue;
    // Boost partially transparent fabric and extremities, but keep a
    // soft edge for hair strands rather than clipping them completely.
    const value=Math.max(0,Math.min(1,(alpha[i]-.055)/.55));
    clean[i]=value*value*(3-2*value);
  }
  // Restore fine low-confidence pixels immediately adjacent to a retained
  // silhouette. This is a 1px outward feather, not destructive erosion.
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x;
    if(clean[i]||alpha[i]<.065)continue;
    if(allowed[labels[i-1]]||allowed[labels[i+1]]||
       allowed[labels[i-width]]||allowed[labels[i+width]]){
      clean[i]=Math.min(.30,alpha[i]*1.7);
    }
  }
  // Repair weak matte regions surrounded by the subject. Leave exterior
  // pixels and large clear openings, such as between an arm and the body.
  const interiorThreshold=.66;
  const smallHole=Math.max(12,Math.min(size*.006,primary*.025));
  const weakForegroundHole=Math.max(smallHole,Math.min(size*.035,primary*.13));
  for(let i=0;i<size;i++){
    if(clean[i]>=interiorThreshold||labels[i]===-1)continue;
    let read=0,write=1,atEdge=false,evidence=0;
    queue[0]=i;labels[i]=-1;
    function visit(j){
      if(clean[j]<interiorThreshold&&labels[j]!==-1){labels[j]=-1;queue[write++]=j;}
    }
    while(read<write){
      const at=queue[read++],x=at%width;
      evidence+=alpha[at];
      if(x>0)visit(at-1);else atEdge=true;
      if(x<width-1)visit(at+1);else atEdge=true;
      if(at>=width)visit(at-width);else atEdge=true;
      if(at+width<size)visit(at+width);else atEdge=true;
    }
    const likelyForeground=write<=weakForegroundHole&&evidence/write>=.13;
    if(!atEdge&&(write<=smallHole||likelyForeground)){
      for(let j=0;j<write;j++)clean[queue[j]]=1;
    }
  }
  return clean;
}

export function removeEdgeColor(pixels,alpha,width,height) {
  const radius=Math.max(3,Math.round(Math.max(width,height)/420));
  const rays=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const offset=(y*width+x)*4;
    const a=alpha[offset+3]/255;
    pixels[offset+3]*=a;
    if(a<=.08||a>=.72)continue;
    const sum=[0,0,0]; let count=0;
    for(const [dx,dy] of rays){
      for(let step=radius;step<=radius*4;step+=radius){
        const sx=x+dx*step,sy=y+dy*step;
        if(sx<0||sx>=width||sy<0||sy>=height)break;
        const source=(sy*width+sx)*4;
        if(alpha[source+3]>=13)continue;
        for(let n=0;n<3;n++)sum[n]+=pixels[source+n];
        count++;
        break;
      }
    }
    if(count>=2){
      const mix=Math.min(.23,(.72-a)*.44)/Math.max(.36,a);
      for(let n=0;n<3;n++){
        const correction=(pixels[offset+n]-sum[n]/count)*mix;
        pixels[offset+n]+=Math.min(18,Math.max(-18,correction));
      }
    }
  }
}

