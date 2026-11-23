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
    trimFoliage(alpha,rgb,width,height);
    return {width,height,alpha};
  } finally {
    input.dispose();
    output?.dispose();
  }
}

export function refineAlpha(alpha,width,height) {
  const size=width*height;
  const visited=new Uint8Array(size), queue=new Int32Array(size);
  let main=new Int32Array();
  // Isolate the primary person and retain the translucent hair around it.
  for(let i=0;i<size;i++){
    if(visited[i]||alpha[i]<.51)continue;
    let read=0,write=1;
    queue[0]=i;visited[i]=1;
    function visit(offset){
      if(!visited[offset]&&alpha[offset]>=.51){queue[write++]=offset;visited[offset]=1;}
    }
    while(read<write){
      const at=queue[read++],column=at%width;
      if(column)visit(at-1);
      if(column<width-1)visit(at+1);
      if(at>=width)visit(at-width);
      if(at+width<size)visit(at+width);
    }
    if(write>main.length)main=queue.slice(0,write);
  }
  if(main.length<size*.006)throw new Error('Chưa tìm thấy chân dung rõ.');
  const near=new Uint8Array(size);
  for(const i of main){
    near[i]=1;
    if(i%width)near[i-1]=1;
    if(i%width<width-1)near[i+1]=1;
    if(i>=width)near[i-width]=1;
    if(i+width<size)near[i+width]=1;
  }
  const clean=new Float32Array(size);
  for(let i=0;i<size;i++){
    if(!near[i]&&!near[i-width]&&!near[i+width]&&!(i%width&&near[i-1])&&!(i%width<width-1&&near[i+1]))continue;
    const value=Math.max(0,Math.min(1,(alpha[i]-.12)/.82));
    clean[i]=value*value*(3-2*value);
  }
  return clean;
}

export function removeEdgeColor(pixels,alpha,width,height) {
  const radius=Math.max(3,Math.round(Math.max(width,height)/420));
  const rays=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const offset=(y*width+x)*4;
    const a=alpha[offset+3]/255;
    if(a<=.08||a>=.98){pixels[offset+3]=alpha[offset+3];continue;}
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
      const mix=Math.min(.58,1-a)/Math.max(.36,a);
      for(let n=0;n<3;n++){
        const correction=(pixels[offset+n]-sum[n]/count)*mix;
        pixels[offset+n]+=Math.min(49,Math.max(-49,correction));
      }
    }
    pixels[offset+3]=alpha[offset+3];
  }
}

// A small patch of foliage can be assigned to the portrait around the hair
// and neckline. Only trim isolated, shallow green patches on the matte edge.
function trimFoliage(alpha,rgb,width,height) {
  const length=alpha.length, distance=new Uint8Array(length);
  let personArea=0, top=height, bottom=0;
  for(let i=0;i<length;i++){
    distance[i]=alpha[i]>.52?60:0;
    if(distance[i]){
      personArea++;
      const y=Math.floor(i/width);
      top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
  }
  for(let i=0;i<length;i++){
    if(distance[i])distance[i]=Math.min(distance[i],(i%width?distance[i-1]:0)+1,(i>=width?distance[i-width]:0)+1);
  }
  for(let i=length-1;i>=0;i--){
    if(distance[i])distance[i]=Math.min(distance[i],(i%width<width-1?distance[i+1]:0)+1,(i+width<length?distance[i+width]:0)+1);
  }
  const limit=Math.max(9,Math.round(Math.min(width,height)*.038));
  const green=new Uint8Array(length), pending=new Int32Array(length);
  for(let i=0;i<length;i++){
    const j=i*4;
    const r=rgb[j],g=rgb[j+1],b=rgb[j+2];
    if(alpha[i]>.10&&g>r+Math.max(3,g*.045)&&g>b+Math.max(3,g*.042))green[i]=1;
  }
  for(let i=0;i<length;i++){
    if(!green[i])continue;
    let read=0,write=1,fringe=0,depth=0,left=width,right=0,lower=0;
    pending[0]=i;green[i]=0;
    function add(j){
      if(green[j]){green[j]=0;pending[write++]=j;}
    }
    while(read<write){
      const at=pending[read++],x=at%width;
      left=Math.min(left,x);right=Math.max(right,x);lower=Math.max(lower,Math.floor(at/width));
      if(distance[at]<=3)fringe++;
      depth=Math.max(depth,distance[at]);
      if(x)add(at-1);
      if(x<width-1)add(at+1);
      if(at>=width)add(at-width);
      if(at+width<length)add(at+width);
    }
    const thinEdge=depth<=limit&&fringe>=Math.max(1,write*.035);
    const betweenHairAndShoulder=right-left<width*.17&&lower<top+(bottom-top)*.69&&fringe>=Math.max(10,write*.012);
    if(write<personArea*.030&&(thinEdge||betweenHairAndShoulder)){
      for(let j=0;j<write;j++)alpha[pending[j]]*=.14;
    }
  }
}
