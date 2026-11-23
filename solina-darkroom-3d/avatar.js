import {portraitFrom,styles,previewGhost,compose,frameFor,portraitRect} from './portrait.js?v=16';

const api='https://solina-so-giam-tuyen.ahnthu1209.chatgpt.site/api/issue';
const get=id=>document.getElementById(id);
const defaults=()=>({x:0,y:0,zoom:1});
const delay=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
export const captions=[
  'Đừng đặt kỳ vọng vào người khác, hãy đặt cọc',
  'Mong gió xuân khẽ động, còn dòng tiền đại động',
  'Không có con đường nào trải đầy hoa hồng, không có hoa hồng tôi không đi',
  'Hữu xạ tự nhiên hương, hữu duyên tự nhiên chốt',
  'Đừng nhìn em lâu...\nNhìn bảng hàng đi anh!',
  'Ngoài mặt kiêu sa\nBên trong chờ khách chốt nhà...',
  'Tôi đã học cách buông bỏ, “buông hợp đồng bỏ vào tay khách”',
];

let db;

const storage=()=>{
  db??=new Promise((resolve,reject)=>{
    const request=indexedDB.open('solina-darkroom',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('artwork');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return db;
};

async function saved(next){
  try {
    const database=await storage();
    return await new Promise((resolve,reject)=>{
      const tx=database.transaction('artwork',next===undefined?'readonly':'readwrite');
      const store=tx.objectStore('artwork');
      const request=next===undefined?store.get('latest'):next===null?store.delete('latest'):store.put(next,'latest');
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  } catch {
    return null;
  }
}

function toBlob(canvas){
  return new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error('Chưa lưu được ảnh PNG.')),'image/png'));
}
function restoreCanvas(image){
  const canvas=Object.assign(document.createElement('canvas'),{width:image.width,height:image.height});
  canvas.getContext('2d').drawImage(image,0,0);
  image.close();
  return canvas;
}
async function recognizeSavedStyle(canvas){
  const size=20;
  const sampler=Object.assign(document.createElement('canvas'),{width:size,height:size}).getContext('2d',{willReadFrequently:true});
  function sample(img){
    sampler.drawImage(img,0,0,size,size);
    return sampler.getImageData(0,0,size,size).data;
  }
  const original=sample(canvas);
  const scores=await Promise.all(styles.map(async (_,i)=>{
    const [background]=await frameFor(i);
    const candidate=sample(background);
    let error=0;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++){
      if(y>=3&&x>=2&&x<size-2)continue;
      const offset=(y*size+x)*4;
      for(let channel=0;channel<3;channel++) error+=Math.min(65,Math.abs(original[offset+channel]-candidate[offset+channel]));
    }
    return error;
  }));
  return scores.indexOf(Math.min(...scores));
}

function newTicket(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}

async function claim(ticket,index){
  let response;
  try {
    response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,style:index+1}),signal:AbortSignal.timeout(10000)});
  } catch {
    throw new Error('Chưa kết nối được sổ giám tuyển. Bấm Thử lại để tiếp tục.');
  }
  const result=await response.json().catch(()=>({}));
  if(result.error==='sold_out') throw Object.assign(new Error('Đã hết số giám tuyển.'),{soldOut:true});
  if(!response.ok||!/^\d{4}$/.test(result.number))throw new Error('Chưa cấp được số. Bấm Thử lại để tiếp tục.');
  return result.number;
}

export function enableAvatar(director){
  const panel=get('portrait-panel'), picker=get('portrait-file'), choices=get('frame-choices');
  const status=get('portrait-status'), cue=get('print-cue'), preview=get('portrait-preview');
  const adjustFields=['x','y','zoom'].map(key=>get('adjust-'+key));
  let subject, original, index=0, adjust=defaults(), record, readyImage;
  let working=false, awaitingNumber=false, busyFile=false, renderKey=0, downloadURL;
  let captionReset, edgeOriginal, stroke, pendingFrame;
  const erase=get('erase-edge'), restore=get('restore-edge'), undo=get('undo-edge');
  let edgeMode;
  const buttons=styles.map((style,i)=>{
    const button=document.createElement('button');
    button.type='button';button.className='sample';
    button.setAttribute('aria-pressed',String(i===index));
    const img=new Image();img.src='./bo-anh/mau-'+(i+1)+'.webp';img.alt='';
    const title=document.createElement('span');title.textContent=style.name;
    button.append(img,title);
    button.addEventListener('click',()=>{
      if(working||awaitingNumber)return;
      stopErasing();index=i;adjust=defaults();updateSliders();select();
    });
    return button;
  });
  choices.replaceChildren(...buttons);

  const tell=message=>{status.textContent=message;};
  function setCue(message){cue.textContent=message;cue.hidden=!message;}
  function updateSliders(){adjustFields.forEach((input,i)=>{input.value=adjust[['x','y','zoom'][i]];});}
  function setPreview(canvas){
    const ctx=preview.getContext('2d');
    ctx.clearRect(0,0,1000,1000);
    ctx.drawImage(canvas,0,0);
  }
  async function select(){
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    get('selected-style').textContent=styles[index].name;
    const key=++renderKey;
    get('wash-photo').disabled=true;
    try {
      const art=await compose(subject,index,adjust);
      if(key!==renderKey) return;
      tell('');setPreview(art);
      get('wash-photo').disabled=false;
    } catch {
      if(key===renderKey) tell('Chưa tải được mẫu này. Hãy thử chọn lại mẫu.');
    }
  }
  adjustFields.forEach(input=>input.addEventListener('input',()=>{
    adjust[input.id.slice(7)]=Number(input.value);select();
  }));
  function setEdgeMode(mode){
    edgeMode=mode;
    erase.setAttribute('aria-pressed',String(mode==='erase'));
    restore.setAttribute('aria-pressed',String(mode==='restore'));
    preview.classList.toggle('editing-edge',Boolean(mode));
    const hint=get('erase-hint');
    hint.hidden=!mode;
    hint.textContent=mode==='restore'?'Tô lên phần người bị mất để lấy lại chi tiết từ ảnh gốc.':'Kéo nhẹ trên phần nền còn sót trong ảnh xem trước.';
    stroke=null;
  }
  function stopErasing(){
    setEdgeMode(null);
    if(pendingFrame){cancelAnimationFrame(pendingFrame);pendingFrame=undefined;}
  }
  function freshEdges(){
    stopErasing();edgeOriginal=null;undo.disabled=true;
  }
  function paintEdge(event,from){
    const area=preview.getBoundingClientRect();
    const rect=portraitRect(subject,index,adjust);
    const x=((event.clientX-area.left)*1000/area.width-rect.x)/rect.scale;
    const y=((event.clientY-area.top)*1000/area.height-rect.y)/rect.scale;
    const brush=subject.getContext('2d'), radius=Math.max(1.5,2.7*1000/area.width/rect.scale);
    const startX=from?.x??x, startY=from?.y??y;
    const drawStroke=(ctx,left=0,top=0)=>{
      ctx.beginPath();ctx.lineWidth=radius*2;ctx.lineCap='round';
      ctx.moveTo(startX-left,startY-top);
      ctx.lineTo(x-left+.001,y-top+.001);
      ctx.stroke();
    };
    if(edgeMode==='restore'){
      const left=Math.max(0,Math.floor(Math.min(x,startX)-radius-1));
      const top=Math.max(0,Math.floor(Math.min(y,startY)-radius-1));
      const right=Math.min(subject.width,Math.ceil(Math.max(x,startX)+radius+1));
      const bottom=Math.min(subject.height,Math.ceil(Math.max(y,startY)+radius+1));
      if(right>left&&bottom>top){
        const patch=Object.assign(document.createElement('canvas'),{width:right-left,height:bottom-top});
        const ctx=patch.getContext('2d');
        drawStroke(ctx,left,top);
        ctx.globalCompositeOperation='source-in';
        ctx.drawImage(original,-left,-top);
        brush.drawImage(patch,left,top);
      }
    } else {
      brush.save();
      brush.globalCompositeOperation='destination-out';
      drawStroke(brush);
      brush.restore();
    }
    get('wash-photo').disabled=true;
    if(!pendingFrame)pendingFrame=requestAnimationFrame(()=>{pendingFrame=undefined;select();});
    return {x,y};
  }
  erase.onclick=()=>setEdgeMode(edgeMode==='erase'?null:'erase');
  restore.onclick=()=>setEdgeMode(edgeMode==='restore'?null:'restore');
  undo.onclick=()=>{
    if(!edgeOriginal)return;
    subject=edgeOriginal;freshEdges();select();
  };
  preview.addEventListener('pointerdown',event=>{
    if(!subject||readyImage||working||!edgeMode||event.button!==0)return;
    event.preventDefault();
    if(!edgeOriginal){
      edgeOriginal=Object.assign(document.createElement('canvas'),{width:subject.width,height:subject.height});
      edgeOriginal.getContext('2d').drawImage(subject,0,0);
      edgeOriginal.portraitBounds=subject.portraitBounds;
      undo.disabled=false;
    }
    preview.setPointerCapture(event.pointerId);
    stroke={...paintEdge(event),id:event.pointerId};
  });
  preview.addEventListener('pointermove',event=>{
    if(stroke?.id===event.pointerId)stroke={...paintEdge(event,stroke),id:event.pointerId};
  });
  preview.addEventListener('lostpointercapture',()=>{stroke=null;});
  function refreshPanel(){
    panel.dataset.step=working?'processing':awaitingNumber?'retry':readyImage?'result':subject?'choose':'upload';
    get('selected-style').hidden=!subject||working||awaitingNumber||!!readyImage;
    get('caption-box').hidden=!readyImage||!get('result-caption').textContent;
    get('choose-title').hidden=!subject||working||awaitingNumber||!!readyImage;
    get('choices-wrap').hidden=(!subject&&!readyImage)||working||awaitingNumber;
    choices.hidden=!!readyImage;
    preview.parentElement.classList.toggle('finished',!!readyImage);
    get('wash-photo').hidden=!!readyImage;
    get('adjustments').hidden=!!readyImage;
    restore.hidden=!original;
    get('portrait-intro').hidden=!!subject||!!readyImage||working;
    get('restart-photo').hidden=(!subject&&!readyImage)||working||awaitingNumber;
    get('download-photo').hidden=!readyImage;
    get('result-number').hidden=!readyImage;
    get('retry-number').hidden=!awaitingNumber||working;
    get('resume-photo').hidden=!record||!!subject||!!readyImage||working;
  }
  async function showResult(canvas,number,png,style){
    readyImage=canvas;
    setPreview(canvas);
    if(downloadURL)URL.revokeObjectURL(downloadURL);
    downloadURL=URL.createObjectURL(png||await toBlob(canvas));
    const link=get('download-photo');
    link.href=downloadURL;
    link.download='SOLINA-Giam-Tuyen-'+number+'.png';
    get('result-digits').textContent=number;
    get('result-caption').textContent=captions[style]||'';
    get('copy-caption').textContent='Sao chép caption';
    tell('');
  }
  async function answerAndReveal(){
    const number=await claim(record.ticket,index);
    const final=await compose(subject,index,adjust,number);
    const png=await toBlob(final);
    record={number,png,style:index};
    await saved(record);
    setCue('Ảnh đang hiện màu');
    await director.reveal(final);
    await showResult(final,number,png,index);
    setCue('');
    awaitingNumber=false;
    refreshPanel();

  }
  async function wash(resume=false){
    if(working||!subject)return;
    working=true;
    stopErasing();
    awaitingNumber=false;
    tell('');
    refreshPanel();
    try {
      await frameFor(index);
      if(!resume){
        if(!record?.ticket)record={ticket:newTicket(),style:index,adjust:{...adjust},bounds:subject.portraitBounds,subject:await toBlob(subject)};
        await saved(record);
        await director.wash(previewGhost(subject,index,adjust),setCue);
      }
      setCue('Đang ghi số giám tuyển');
      await answerAndReveal();
    } catch(error) {
      tell(error.message);
      awaitingNumber=!error.soldOut&&!!record?.ticket;
      setCue('');director.unlock();
    } finally {
      working=false;
      refreshPanel();
      if(readyImage)get('download-photo').focus({preventScroll:true});
    }
  }

  picker.addEventListener('change',async ()=>{
    const file=picker.files[0];
    picker.value='';
    if(!file||busyFile)return;
    busyFile=true;
    picker.disabled=true;
    const previous=subject;
    try {
      tell('Đang mở ảnh…');
      await delay(32);
      const photo=await portraitFrom(file,tell);
      freshEdges();subject=photo.subject;original=photo.original;record=null;readyImage=null;index=0;adjust=defaults();updateSliders();
      await saved(null);
      setCue('');
      tell('');refreshPanel();
      await select();
      get('choose-title').focus({preventScroll:true});
    } catch(error) {
      tell(error.message);subject=previous;
    } finally {
      busyFile=false;picker.disabled=false;refreshPanel();
    }
  });
  get('wash-photo').onclick=()=>wash();
  get('retry-number').onclick=()=>wash(true);
  get('resume-photo').onclick=async()=>{
    if(!record?.subject||working) return;
    try {
      subject=restoreCanvas(await createImageBitmap(record.subject));
      subject.portraitBounds=record.bounds;
      index=record.style;adjust=record.adjust;updateSliders();
      await wash();
    } catch(error) {
      tell(error.message);
    }
  };
  get('restart-photo').onclick=async()=>{
    if(working)return;
    if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;}
    freshEdges();record=null;readyImage=null;subject=null;original=null;index=0;adjust=defaults();
    director.reset();updateSliders();refreshPanel();
    tell('');setCue('');
    await saved(null);
    picker.focus({preventScroll:true});
  };

  const copy=get('copy-caption');
  copy.onclick=async()=>{
    clearTimeout(captionReset);
    const text=get('result-caption');
    try {
      await navigator.clipboard.writeText(text.textContent);
      copy.textContent='Đã sao chép';
      captionReset=setTimeout(()=>{copy.textContent='Sao chép caption';},1800);
    } catch {
      const range=document.createRange();
      range.selectNodeContents(text);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      tell('Caption đã được chọn để bạn sao chép.');
    }
  };

  panel.hidden=false;
  refreshPanel();
  saved().then(async state=>{
    if(!state||subject||busyFile)return;
    record=state;
    if(state.number&&state.png){
      const picture=restoreCanvas(await createImageBitmap(state.png));
      let style=state.style;
      if(!Number.isInteger(style)){
        style=await recognizeSavedStyle(picture).catch(()=>undefined);
        if(Number.isInteger(style)&&record===state){record={...state,style};await saved(record);}
        else if(record!==state)return;
      }
      await showResult(picture,state.number,state.png,style);
    }
    refreshPanel();
  }).catch(()=>{});
}
