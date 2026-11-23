import {portraitMask,refineAlpha,removeEdgeColor} from './matte.js?v=17';
let model;
const canvas=(w,h=w)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const context=(surface,options)=>surface.getContext('2d',options);
const loadImage=async src=>{
  const image=new Image();
  image.src=src;
  await image.decode();
  return image;
};
function script(src){
  return new Promise((resolve,reject)=>{
    const tag=document.createElement('script');
    const failed=()=>{clearTimeout(timer);tag.remove();reject(new Error('Chưa tải được thư viện tách nền.'));};
    const timer=setTimeout(failed,15000);
    tag.src=src;tag.onload=()=>{clearTimeout(timer);resolve();};
    tag.onerror=failed;
    document.head.append(tag);
  });
}

async function assets(){
  const root='https://cdn.jsdelivr.net/npm/';
  if(!window.tf) await script(root+'@tensorflow/tfjs@4.22.0/dist/tf.min.js');
  await window.tf.setBackend('cpu');
  await window.tf.ready();
  if(!window.bodyPix) await script('./bo-anh/body-pix-2.2.0.js');
  return window.bodyPix.load({architecture:'MobileNetV1',outputStride:16,multiplier:.75,quantBytes:2});
}

export async function portraitFrom(file,notify) {
  if(file.size>30*1024*1024) throw new Error('Ảnh cần nhẹ hơn 30 MB.');
  let bitmap;
  try {bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}
  catch {throw new Error('Hãy chọn ảnh JPG, PNG hoặc WebP mà trình duyệt có thể mở.');}
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const surface=canvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));
  const ctx=context(surface,{willReadFrequently:true});
  ctx.drawImage(bitmap,0,0,surface.width,surface.height);
  bitmap.close();
  const pixels=ctx.getImageData(0,0,surface.width,surface.height);
  let transparentPixels=0;
  for(let i=3;i<pixels.data.length;i+=4) {
    if(pixels.data[i]<25)transparentPixels++;
  }
  const transparent=transparentPixels>surface.width*surface.height*.03;
  let original=null;
  if(!transparent) {
    notify('Đang tách nền chân dung…');
    original=canvas(surface.width,surface.height);
    context(original).drawImage(surface,0,0);
    try {
      applyMask(ctx,surface,pixels,await portraitMask(original,script));
      surface.portraitBounds=portraitBounds(surface);
    } catch(error) {
      console.warn('Đang chuyển bộ tách nền',error);
      const mask=await alternativeMask(original);
      ctx.clearRect(0,0,surface.width,surface.height);
      ctx.drawImage(original,0,0);
      applyMask(ctx,surface,ctx.getImageData(0,0,surface.width,surface.height),mask);
    }
  }
  surface.portraitBounds??=portraitBounds(surface);
  return {subject:surface,original};
}

async function alternativeMask(surface){
  model??=assets().catch(error=>{model=undefined;throw error;});
  let segmenter;
  try {segmenter=await model;}
  catch {throw new Error('Chưa tải được bộ tách nền. Hãy thử lại hoặc chọn PNG đã tách nền.');}
  // Do not force portrait or couple photos into a square: stretching a person
  // before segmentation makes shoes, arms and dress hems disappear.
  const ratio=Math.min(1,640/Math.max(surface.width,surface.height));
  const width=Math.max(64,Math.round(surface.width*ratio));
  const height=Math.max(64,Math.round(surface.height*ratio));
  const mask=canvas(width,height),brush=context(mask);
  brush.drawImage(surface,0,0,width,height);
  const result=await segmenter.segmentPerson(mask,{
    internalResolution:'full',segmentationThreshold:.55,
    maxDetections:3,scoreThreshold:.20,nmsRadius:20
  });
  const data=brush.createImageData(width,height);
  for(let i=0;i<result.data.length;i++)data.data[i*4+3]=result.data[i]*255;
  brush.putImageData(data,0,0);
  const softened=canvas(width,height),edge=context(softened);
  edge.filter='blur(.7px)';
  edge.drawImage(mask,0,0);
  const pixels=edge.getImageData(0,0,width,height).data;
  return {width,height,alpha:Float32Array.from(result.data,(_,i)=>pixels[i*4+3]/255)};
}

function applyMask(ctx,surface,pixels,mask){
  const {width,height,alpha}=mask;
  const cover=canvas(width,height), brush=context(cover);
  const clean=refineAlpha(alpha,width,height);
  const layer=brush.createImageData(width,height);
  for(let i=0;i<clean.length;i++)layer.data[i*4+3]=Math.round(clean[i]*255);
  brush.putImageData(layer,0,0);
  const scaled=canvas(surface.width,surface.height);
  const projector=context(scaled,{willReadFrequently:true});
  projector.imageSmoothingQuality='high';
  projector.drawImage(cover,0,0,scaled.width,scaled.height);
  const edge=projector.getImageData(0,0,scaled.width,scaled.height);
  removeEdgeColor(pixels.data,edge.data,scaled.width,scaled.height);
  ctx.putImageData(pixels,0,0);
}

function portraitBounds(surface){
  const {width,height}=surface;
  const rgba=context(surface).getImageData(0,0,width,height).data;
  let l=width,r=0,t=height,b=0,area=0;
  for(let y=0;y<height;y+=2) for(let x=0;x<width;x+=2){
    if(rgba[(y*width+x)*4+3]>116){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);area++;}
  }
  if(area<width*height*.0015 || r-l<12 || b-t<16) throw new Error('Chưa tìm thấy chân dung rõ. Bạn thử chọn ảnh sáng hơn có một người.');
  const pad=10;
  l=Math.max(0,l-pad);t=Math.max(0,t-pad);r=Math.min(width,r+pad);b=Math.min(height,b+pad);
  return {x:l,y:t,width:r-l,height:b-t};
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

export function portraitRect(subject,index,adjust,size=1000){
  const style=styles[index];
  const bounds=subject.portraitBounds??{x:0,y:0,width:subject.width,height:subject.height};
  const availableHeight=Math.min(style.height,1-style.top);
  const scale=Math.min(size*availableHeight/bounds.height,size*style.maxWidth/bounds.width)*adjust.zoom;
  const x=(style.x+adjust.x)*size-(bounds.x+bounds.width/2)*scale;
  const y=(style.top+adjust.y)*size-bounds.y*scale;
  return {x,y,w:subject.width*scale,h:subject.height*scale,scale};
}

function drawPortrait(ctx,subject,index,adjust,size,ghost=false){
  const style=styles[index];
  const {x,y,w,h}=portraitRect(subject,index,adjust,size);
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
  drawPortrait(ctx,subject,index,adjust,1000,true);
  return out;
}

export async function compose(subject,index,adjust,number){
  const [background,type,art]=await frameFor(index);
  const out=canvas(1000),ctx=context(out);
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(background,0,0,1000,1000);
  if(index===6){
    // Continue the original paper texture across the dark corner of the
    // editable background. The sample-card artwork uses a separate image.
    ctx.save();
    ctx.scale(1000/600,1000/600);
    ctx.beginPath();
    ctx.moveTo(0,519);ctx.lineTo(217,573);ctx.lineTo(210,600);
    ctx.lineTo(0,600);ctx.closePath();ctx.clip();
    ctx.transform(1,.5,0,-1,0,1038);
    ctx.drawImage(background,0,0,600,600);
    ctx.restore();
  }
  drawPortrait(ctx,subject,index,adjust,1000);
  ctx.save();ctx.scale(1000/600,1000/600);
  const [lx,ly,lw,lh]=type.label;
  ctx.drawImage(art,0,0,lw,lh,lx,ly,lw,lh);
  if(number) {
    const digits=[...number].map(n=>type.digits[Number(n)]);
    const width=digits.reduce((sum,d)=>sum+(d[2]+type.spacing)*type.scale,0)-type.spacing*type.scale;
    let x=lx+lw-width;
    const y=ly+lh+3;
    for(const [sx,sy,w,h] of digits){
      ctx.drawImage(art,sx,sy,w,h,x,y,w*type.scale,h*type.scale);
      x+=(w+type.spacing)*type.scale;
    }
  }
  ctx.restore();
  return out;
}
