const visionRoot='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304';
const modelURL='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
let model;
const canvas=(w,h=w)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const context=(surface,options)=>surface.getContext('2d',options);
const loadImage=async src=>{
  const image=new Image();
  image.src=src;
  await image.decode();
  return image;
};
const assets=async ()=>{
  const script=await import(visionRoot+'/+esm');
  const files=await script.FilesetResolver.forVisionTasks(visionRoot+'/wasm');
  return script.ImageSegmenter.createFromOptions(files,{
    baseOptions:{modelAssetPath:modelURL,delegate:'CPU'},runningMode:'IMAGE',
    outputCategoryMask:false,outputConfidenceMasks:true,
  });
};

export async function portraitFrom(file,notify) {
  if(file.size>30*1024*1024) throw new Error('Ảnh cần nhẹ hơn 30 MB.');
  let bitmap;
  try {bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}
  catch {throw new Error('Hãy chọn ảnh JPG, PNG hoặc WebP mà trình duyệt có thể mở.');}
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const surface=canvas(Math.round(bitmap.width*scale),Math.round(bitmap.height*scale));
  const ctx=context(surface,{willReadFrequently:true});
  ctx.drawImage(bitmap,0,0,surface.width,surface.height);
  bitmap.close();
  const pixels=ctx.getImageData(0,0,surface.width,surface.height);
  let transparent=false;
  for(let i=3;i<pixels.data.length;i+=32){if(pixels.data[i]<25){transparent=true;break;}}
  if(!transparent) {
    notify('Đang tách nền chân dung…');
    model??=assets().catch(e=>{model=undefined;throw e;});
    let segmenter;
    try {segmenter=await model;}
    catch {throw new Error('Chưa tải được bộ tách nền. Hãy thử lại hoặc chọn PNG đã tách nền.');}
    const maskArea=canvas(512);
    const ratio=512/Math.max(surface.width,surface.height);
    const w=surface.width*ratio,h=surface.height*ratio,x=(512-w)/2,y=(512-h)/2;
    const m=context(maskArea);
    m.fillStyle='#7d7d7d';m.fillRect(0,0,512,512);m.drawImage(surface,x,y,w,h);
    segmenter.segment(maskArea,result=>{
      const bg=result.confidenceMasks[0];
      const mask=canvas(bg.width,bg.height), brush=context(mask);
      const values=bg.getAsFloat32Array();
      const data=brush.createImageData(mask.width,mask.height);
      for(let i=0;i<values.length;i++){
        const v=Math.max(0,Math.min(1,((1-values[i])-.18)/.70));
        data.data[i*4+3]=255*v*v*(3-2*v);
      }
      brush.putImageData(data,0,0);
      applyMask(ctx,surface,mask,x,y,w,h);
    });
  }
  return cropPortrait(surface);
}

function applyMask(ctx,surface,mask,x,y,w,h){
  const mx=mask.width/512,my=mask.height/512;
  ctx.globalCompositeOperation='destination-in';
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(mask,x*mx,y*my,w*mx,h*my,0,0,surface.width,surface.height);
  ctx.globalCompositeOperation='source-over';
}

function cropPortrait(surface){
  const {width,height}=surface;
  const rgba=context(surface).getImageData(0,0,width,height).data;
  let l=width,r=0,t=height,b=0,area=0;
  for(let y=0;y<height;y+=2) for(let x=0;x<width;x+=2){
    if(rgba[(y*width+x)*4+3]>116){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);area++;}
  }
  if(area<width*height*.008 || r-l<38 || b-t<60) throw new Error('Chưa tìm thấy chân dung rõ. Bạn thử chọn ảnh sáng hơn có một người.');
  const pad=10;
  l=Math.max(0,l-pad);t=Math.max(0,t-pad);r=Math.min(width,r+pad);b=Math.min(height,b+pad);
  const result=canvas(r-l,b-t);
  context(result).drawImage(surface,l,t,result.width,result.height,0,0,result.width,result.height);
  return result;
}

export const styles=[
  {name:'The Sovereign Gaze', x:.50, top:.205,height:.83,maxWidth:.69,look:'saturate(.82) contrast(1.04)'},
  {name:'Motion Being · Hoàng hôn', x:.505,top:.337,height:.68,maxWidth:.58,look:'saturate(.68) sepia(.14)'},
  {name:'Elegance',x:.50,top:.257,height:.76,maxWidth:.55,look:'grayscale(1) contrast(1.09)'},
  {name:'The Art of Being',x:.603,top:.260,height:.77,maxWidth:.55,look:'saturate(.70) contrast(1.02)',shadow:true},
  {name:'Feel Like You',x:.498,top:.297,height:.74,maxWidth:.57,look:'saturate(.86) contrast(1.04)'},
  {name:'Motion Being · Ánh ô liu',x:.50,top:.235,height:.78,maxWidth:.91,look:'contrast(1.13) saturate(.74)'},
  {name:'Feel Like Home',x:.434,top:.223,height:.80,maxWidth:.63,look:'saturate(.70) sepia(.08)'},
];
const rendering=new Map();
export function frameFor(index) {
  if(!rendering.has(index)){
    const pending=Promise.all([
      loadImage('./bo-anh/nen-'+(index+1)+'.webp'),
      fetch('./bo-anh/chu-'+(index+1)+'.json').then(r=>{if(!r.ok)throw new Error('Thiếu lớp chữ Canva.');return r.json();}),
      loadImage('./bo-anh/chu-'+(index+1)+'.png'),
    ]).catch(e=>{rendering.delete(index);throw e;});
    rendering.set(index,pending);
  }
  return rendering.get(index);
}

function drawPortrait(ctx,subject,style,adjust,size,ghost=false){
  const s=Math.min(size*style.height/subject.height,size*style.maxWidth/subject.width)*adjust.zoom;
  const w=subject.width*s,h=subject.height*s;
  const x=(style.x+adjust.x)*size-w/2;
  const y=(style.top+adjust.y)*size;
  if(style.shadow&&!ghost){
    const shadow=canvas(subject.width,subject.height);
    const brush=context(shadow);
    brush.drawImage(subject,0,0);
    brush.globalCompositeOperation='source-in';
    brush.fillStyle='#0a172b';brush.fillRect(0,0,shadow.width,shadow.height);
    ctx.save();ctx.globalAlpha=.50;ctx.filter='blur('+size*.002+'px)';
    ctx.drawImage(shadow,x-size*.088,y+size*.095,w*.97,h*.99);
    ctx.restore();
  }
  ctx.save();
  ctx.filter=ghost?'grayscale(1) contrast(.85)':style.look;
  if(ghost) ctx.globalAlpha=.27;
  ctx.drawImage(subject,x,y,w,h);
  ctx.restore();
}

export function previewGhost(subject,index,adjust){
  const out=canvas(1000),ctx=context(out);
  ctx.fillStyle='#eeeae2';ctx.fillRect(0,0,1000,1000);
  drawPortrait(ctx,subject,{...styles[index],shadow:false},adjust,1000,true);
  return out;
}

export async function compose(subject,index,adjust,number){
  const [background,type,art]=await frameFor(index);
  const out=canvas(1000),ctx=context(out);
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(background,0,0,1000,1000);
  drawPortrait(ctx,subject,styles[index],adjust,1000);
  ctx.save();ctx.scale(1000/600,1000/600);
  const [lx,ly,lw,lh]=type.label;
  ctx.drawImage(art,0,0,lw,lh,lx,ly,lw,lh);
  if(number) {
    const digits=[...number].map(n=>type.digits[Number(n)]);
    const width=digits.reduce((sum,d)=>sum+(d[2]+type.spacing)*type.scale,0)-type.spacing*type.scale;
    let x=type.align==='end'?type.x-width:type.x;
    for(const [sx,sy,w,h] of digits){
      ctx.drawImage(art,sx,sy,w,h,x,type.bottom-h*type.scale,w*type.scale,h*type.scale);
      x+=(w+type.spacing)*type.scale;
    }
  }
  ctx.restore();
  return out;
}
