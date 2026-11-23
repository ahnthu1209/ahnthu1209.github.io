const route = ['entree','allee-a','allee-b','allee-c','allee-d','allee-e','allee-f'];
const available = new Set([...route,'bacs','tirages']);

async function loadCube(name) {
  const image = new Image();
  image.src='./panorama/'+name+'-gallery.webp?v=18';
  await image.decode();
  const size=image.naturalWidth/3;
  if (!Number.isInteger(size) || image.naturalHeight!==size*2) throw new Error('Ảnh 360° không hợp lệ');
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;
  canvas.height=image.naturalHeight;
  const mapper=canvas.getContext('2d',{willReadFrequently:true});
  mapper.drawImage(image,0,0);
  const pixelData=mapper.getImageData(0,0,canvas.width,canvas.height);
  return {size,width:canvas.width,pixels:new Uint32Array(pixelData.data.buffer)};
}

function lookup(x,y,z,size,width) {
  const X=Math.abs(x),Y=Math.abs(y),Z=Math.abs(z);
  let face,u,v,length;
  if (Z>=X && Z>=Y) {
    face=z>=0 ? 0 : 2;
    u=z>=0 ? x : -x; v=y; length=Z;
  } else if (X>=Y) {
    face=x>=0 ? 1 : 3;
    u=x>=0 ? -z : z; v=y; length=X;
  } else {
    face=y>=0 ? 4 : 5;
    u=x; v=y>=0 ? -z : z; length=Y;
  }
  const px=Math.min(size-1,Math.max(0,((u/length+1)*size*.5)|0));
  const py=Math.min(size-1,Math.max(0,((1-v/length)*size*.5)|0));
  return (face%3)*size+px+(Math.floor(face/3)*size+py)*width;
}

export async function createPanoramaView(viewport) {
  const display=document.createElement('canvas');
  const painter=display.getContext('2d',{alpha:false});
  const frames=new Map();
  const loading=new Map();
  let currentName='entree';
  let current=await loadCube(currentName);
  frames.set(currentName,current);
  let settings;
  let pending=0;
  let out;
  let pixels;
  let sampled;
  let cacheKey='';

  function schedule() {
    if (!pending) pending=requestAnimationFrame(paint);
  }

  function ensure(name) {
    if (!available.has(name) || frames.has(name) || loading.has(name)) return;
    const task=loadCube(name).then(frame=>{
      frames.set(name,frame);
      while (frames.size>3) {
        const candidate=[...frames.keys()].find(key=>key!==currentName&&key!==name);
        frames.delete(candidate);
      }
      schedule();
    }).catch(error=>console.warn('Không tải được góc nhìn '+name,error))
      .finally(()=>loading.delete(name));
    loading.set(name,task);
  }

  function paint() {
    pending=0;
    if (!settings || !viewport.clientWidth) return;
    const {active,value,yaw,pitch,orientation,zoom=1}=settings;
    const index=Math.round(value*(route.length-1));
    const selected=active==='trays' ? 'bacs' : active==='prints' ? 'tirages' : route[index];
    const next=frames.get(selected);
    if (next) {
      current=next;
      currentName=selected;
      frames.delete(selected);
      frames.set(selected,next);
    } else ensure(selected);
    if (active!=='trays' && active!=='prints') ensure(route[index+1]);

    const aspect = viewport.clientHeight / viewport.clientWidth;
    const width = Math.min(orientation ? Math.floor(Math.sqrt(250000 / aspect)) : 1200,viewport.clientWidth);
    const height=Math.round(width*viewport.clientHeight/viewport.clientWidth);
    if (!width || !height) return;
    if (!out || width!==display.width || height!==display.height) {
      display.width=width;
      display.height=height;
      out=painter.createImageData(width,height);
      pixels=new Uint32Array(out.data.buffer);
      sampled=new Uint32Array(width*height);
    }

    const field=active==='trays' ? 42 : active==='prints' ? 49 : width<height ? 71 :
      Math.atan(.8571429*height/width)*360/Math.PI;
    const portrait=width/height<.95 && (active==='trays'||active==='prints') ? 12 : 0;
    const tilt=Math.max(-1.08,Math.min(1.08,pitch));
    const rotation=active==='entry' ? Math.max(-.93,Math.min(.93,yaw)) : yaw;
    const projection=[width,height,current.size,field,portrait,zoom,
      ...(orientation ? orientation.toArray() : [tilt,rotation])].join(':');
    if (cacheKey!==projection) {
      cacheKey=projection;
      const dx=Math.tan((field+portrait)*Math.PI/360)*2/(height*zoom);
      const upright=Math.cos(tilt);
      const lowered=Math.sin(tilt);
      const ahead=Math.cos(rotation);
      const side=Math.sin(rotation);
      // Project the same camera-space ray used by Three.js (-Z forward),
      // then convert Z to the cubemap convention (+Z forward).
      let xx, xy, xz, yx, yy, yz, zx, zy, zz;
      if (orientation) {
        const {x,y,z,w}=orientation;
        xx=1-2*(y*y+z*z); xy=2*(x*y-z*w); xz=2*(x*z+y*w);
        yx=2*(x*y+z*w); yy=1-2*(x*x+z*z); yz=2*(y*z-x*w);
        zx=2*(x*z-y*w); zy=2*(y*z+x*w); zz=1-2*(x*x+y*y);
      }
      for (let row=0;row<height;row++) {
        const y=(height*.5-row-.5)*dx;
        const up=y*upright+lowered;
        const forward=upright-y*lowered;
        const offset=row*width;
        for(let col=0;col<width;col++) {
          const right=(col+.5-width*.5)*dx;
          sampled[offset+col]=orientation
            ? lookup(xx*right+xy*y-xz,yx*right+yy*y-yz,zz-zx*right-zy*y,current.size,current.width)
            : lookup(right*ahead-forward*side,up,forward*ahead+right*side,current.size,current.width);
        }
      }
    }
    for (let i=0;i<pixels.length;i++) pixels[i]=current.pixels[sampled[i]];
    painter.putImageData(out,0,0);
  }

  ensure('bacs');
  ensure('tirages');
  return {
    element:display,
    mode:'panorama',
    draw(next) { settings=next; schedule(); },
  };
}
