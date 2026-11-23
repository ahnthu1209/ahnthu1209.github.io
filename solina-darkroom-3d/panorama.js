const rooms = ['entree','allee-a','allee-b','allee-c','allee-d','allee-e','allee-f'];
const fullTurn = 2*Math.PI;

async function loadView(name) {
  const image = new Image();
  image.src = './panorama/'+name+'.webp';
  await image.decode();
  const buffer = document.createElement('canvas');
  buffer.width = image.naturalWidth;
  buffer.height = image.naturalHeight;
  const context = buffer.getContext('2d', {willReadFrequently:true});
  context.drawImage(image,0,0);
  return {width:buffer.width,height:buffer.height,pixels:context.getImageData(0,0,buffer.width,buffer.height).data};
}

export async function createPanoramaView(viewport) {
  const surface = document.createElement('canvas');
  const painter = surface.getContext('2d', {alpha:false});
  const frames = new Map([['entree',await loadView('entree')]]);
  let frame, settings, pending = 0;
  let width = 0;
  let height = 0;
  let projectionKey;
  let sample;
  const paint = () => {
    pending = 0;
    if (!settings) return;
    const {active, value, yaw, pitch} = settings;
    const current = value*(rooms.length-1);
    const key = active === 'trays' ? 'bacs' : active === 'prints' ? 'tirages' : rooms[Math.round(current)];
    let a = frames.get(key);
    let b;
    let fraction=0;
    if (active !== 'trays' && active !== 'prints') {
      const i = Math.floor(current);
      const j = Math.min(i+1,rooms.length-1);
      const first = frames.get(rooms[i]);
      const second = frames.get(rooms[j]);
      if (first && second && first !== second) {
        a=first;
        b=second;
        fraction = Math.max(0,Math.min(1,(current-i-.30)/.40));
        if (fraction >= 1) { a=b; b=null; }
        if (fraction <= 0) b=null;
      }
    }
    if (!a) a=frames.get('entree');
    const targetWidth = Math.round(Math.min(760,viewport.clientWidth));
    const targetHeight = Math.round(targetWidth*viewport.clientHeight/viewport.clientWidth);
    if (!targetWidth || !targetHeight) return;
    if (width !== targetWidth || height !== targetHeight) {
      width = surface.width = targetWidth;
      height = surface.height = targetHeight;
      frame = painter.createImageData(width,height);
    }
    const field = (active === 'trays' ? 42 : active === 'prints' ? 49 : width<height ? 71 : 49)
      + (width/height < .95 && (active === 'trays' || active === 'prints') ? 12 : 0);
    const tilt = Math.max(-1.05, Math.min(1.05,pitch));
    const rotation = active === 'entry' ? Math.max(-.93,Math.min(.93,yaw)) : yaw;
    const keyProjection = [width,height,a.width,a.height,field,tilt,rotation].join('/');
    if (projectionKey !== keyProjection) {
      projectionKey = keyProjection;
      sample = new Uint32Array(width*height);
      const ySin = Math.sin(tilt), yCos = Math.cos(tilt);
      const stride = Math.tan(field*Math.PI/360)*2/height;
      for (let y=0;y<height;y++) {
        const row = (height/2-y-.5)*stride;
        const up = row*yCos+ySin;
        const back = yCos-row*ySin;
        for (let x=0;x<width;x++) {
          const right = (x+.5-width/2)*stride;
          const azimuth = .5+(Math.atan2(right,back)-rotation)/fullTurn;
          const longitude = azimuth-Math.floor(azimuth);
          const latitude = .5-Math.atan2(up,Math.sqrt(back*back+right*right))/Math.PI;
          sample[x+y*width] = ((longitude*a.width|0)+(latitude*a.height|0)*a.width)*4;
        }
      }
    }
    const data = frame.data;
    for (let i=0;i<sample.length;i++) {
      const j = sample[i], dest=i*4;
      if (b) {
        data[dest] = a.pixels[j] + (b.pixels[j]-a.pixels[j])*fraction;
        data[dest+1] = a.pixels[j+1] + (b.pixels[j+1]-a.pixels[j+1])*fraction;
        data[dest+2] = a.pixels[j+2] + (b.pixels[j+2]-a.pixels[j+2])*fraction;
      } else {
        data[dest]=a.pixels[j];
        data[dest+1]=a.pixels[j+1];
        data[dest+2]=a.pixels[j+2];
      }
      data[dest+3]=255;
    }
    painter.putImageData(frame,0,0);
  };

  const refresh = () => { if (!pending) pending=requestAnimationFrame(paint); };
  for (const key of ['bacs','tirages',...rooms.slice(1)]) {
    loadView(key).then(image => { frames.set(key,image); refresh(); })
      .catch(error => console.warn('Không tải được góc nhìn '+key,error));
  }
  return {
    element:surface,
    mode:'panorama',
    draw(next) { settings=next; refresh(); },
  };
}
