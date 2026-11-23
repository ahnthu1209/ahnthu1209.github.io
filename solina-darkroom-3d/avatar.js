import {portraitFrom,styles,previewGhost,compose,frameFor} from './portrait.js?v=7';

const api='https://solina-so-giam-tuyen.ahnthu1209.chatgpt.site/api/issue';
const get=id=>document.getElementById(id);
const defaults=()=>({x:0,y:0,zoom:1});
const delay=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
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
  let subject, index=0, adjust=defaults(), record, readyImage;
  let working=false, awaitingNumber=false, busyFile=false, renderKey=0, downloadURL;
  const buttons=styles.map((style,i)=>{
    const button=document.createElement('button');
    button.type='button';button.className='sample';
    button.setAttribute('aria-pressed',String(i===index));
    const img=new Image();img.src='./bo-anh/mau-'+(i+1)+'.webp';img.alt='';
    button.append(img,style.name);
    button.addEventListener('click',()=>{
      if(working||awaitingNumber)return;
      index=i;adjust=defaults();updateSliders();select();
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
    const key=++renderKey;
    get('wash-photo').disabled=true;
    try {
      const art=await compose(subject,index,adjust);
      if(key!==renderKey) return;
      setPreview(art);
      get('wash-photo').disabled=false;
    } catch {
      if(key===renderKey) tell('Chưa tải được mẫu này. Hãy thử chọn lại mẫu.');
    }
  }
  adjustFields.forEach(input=>input.addEventListener('input',()=>{
    adjust[input.id.slice(7)]=Number(input.value);select();
  }));
  function refreshPanel(){
    get('choose-title').hidden=!subject||working||awaitingNumber||!!readyImage;
    get('choices-wrap').hidden=(!subject&&!readyImage)||working||awaitingNumber;
    choices.hidden=!!readyImage;
    preview.parentElement.classList.toggle('finished',!!readyImage);
    get('wash-photo').hidden=!!readyImage;
    get('adjustments').hidden=!!readyImage;
    get('portrait-intro').hidden=!!subject||!!readyImage||working;
    get('restart-photo').hidden=(!subject&&!readyImage)||working||awaitingNumber;
    get('download-photo').hidden=!readyImage;
    get('result-number').hidden=!readyImage;
    get('retry-number').hidden=!awaitingNumber||working;
    get('resume-photo').hidden=!record||!!subject||!!readyImage||working;
  }
  async function showResult(canvas,number,png){
    readyImage=canvas;
    setPreview(canvas);
    if(downloadURL)URL.revokeObjectURL(downloadURL);
    downloadURL=URL.createObjectURL(png||await toBlob(canvas));
    const link=get('download-photo');
    link.href=downloadURL;
    link.download='SOLINA-Giam-Tuyen-'+number+'.png';
    get('result-number').textContent='# Giám tuyển '+number;
    tell('');
  }
  async function answerAndReveal(){
    const number=await claim(record.ticket,index);
    const final=await compose(subject,index,adjust,number);
    const png=await toBlob(final);
    record={number,png};
    await saved(record);
    setCue('Ảnh đang hiện màu');
    await director.reveal(final);
    await showResult(final,number,png);
    setCue('');
    awaitingNumber=false;
    refreshPanel();
    get('download-photo').focus();
  }
  async function wash(resume=false){
    if(working||!subject)return;
    working=true;
    awaitingNumber=false;
    tell('');
    refreshPanel();
    try {
      await frameFor(index);
      if(!resume){
        if(!record?.ticket)record={ticket:newTicket(),style:index,adjust:{...adjust},subject:await toBlob(subject)};
        await saved(record);
        get('stage').scrollIntoView({block:'center',behavior:'instant'});
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
      subject=photo;record=null;readyImage=null;index=0;adjust=defaults();updateSliders();
      await saved(null);
      setCue('');
      tell('');refreshPanel();
      await select();
      get('choose-title').focus();
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
      index=record.style;adjust=record.adjust;updateSliders();
      await wash();
    } catch(error) {
      tell(error.message);
    }
  };
  get('restart-photo').onclick=async()=>{
    if(working)return;
    if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;}
    record=null;readyImage=null;subject=null;index=0;adjust=defaults();
    director.reset();updateSliders();refreshPanel();
    tell('');setCue('');
    await saved(null);
    picker.focus();
  };

  panel.hidden=false;
  refreshPanel();
  saved().then(async state=>{
    if(!state||subject||busyFile)return;
    record=state;
    if(state.number&&state.png)await showResult(restoreCanvas(await createImageBitmap(state.png)),state.number,state.png);
    refreshPanel();
  }).catch(()=>{});
}
