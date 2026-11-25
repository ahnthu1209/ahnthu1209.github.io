/* HSK3 Classroom · Exact text sourced from uploaded 46-page "Ôn tập 1" PDF.
   Word lists are extracted from all nonempty source table cells; grammar pages retain every nonblank source line.
   Exercises / translated homework pages are intentionally excluded from the learning UI. */
(()=>{
'use strict';

// Small original feedback chimes, synthesized locally on answer clicks. No media downloads.
const SFX=(()=>{
 const KEY='hsk-classroom-sfx-enabled-v1';
 let on=true,ctx=null;
 try{on=localStorage.getItem(KEY)!=='off';}catch(_){}
 function toggle(){on=!on;try{localStorage.setItem(KEY,on?'on':'off');}catch(_){}return on;}
 function play(result){
  if(!on)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return;
   if(!ctx)ctx=new Audio();
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   const t=ctx.currentTime+.012;
   function note(freq,delay,duration,volume,type='sine',endFreq=0){
    const osc=ctx.createOscillator(),gain=ctx.createGain(),at=t+delay;
    osc.type=type;osc.frequency.setValueAtTime(freq,at);
    if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,at+duration*.85);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(at);osc.stop(at+duration+.03);
   }
   if(result==='correct'||result==='right'){
    note(523.25,0,.19,.047);
    note(659.25,.085,.20,.045);
    note(783.99,.18,.28,.052);
   }else if(result==='wrong'){
    note(365,0,.30,.041,'triangle',245);
    note(235,.17,.28,.028,'sine',170);
   }
  }catch(_){/* Never stop study if audio is unavailable. */}
 }
 return {get enabled(){return on;},toggle,play};
})();

const D=window.HSK3_DATA;
const app=document.getElementById('app');
if(!D||!app){document.body.textContent='Không thể tải dữ liệu bài học.';return;}
const match=location.pathname.match(/\/hsk3\/bai-(10|[1-9])\/?/);
const lessonNumber=match?Number(match[1]):0;
const lesson=D.lessons.find(x=>x.number===lessonNumber)||null;
const STORE='hsk3-on-tap-1-progress-v1';
let P=load();

// hsk3-save-rounds-v2: lesson & stage-specific active and completed quizzes.
const rememberedView=lesson&&P.views[lesson.number]||{};
const UI={tab:rememberedView.tab==='grammar'?'grammar':'vocab',
 stage:Number.isInteger(rememberedView.stage)&&rememberedView.stage>=0&&rememberedView.stage<4?rememberedView.stage:0,
 mode:['list','flash','quiz'].includes(rememberedView.mode)?rememberedView.mode:'list',
 cardIndex:Number.isInteger(rememberedView.cardIndex)&&rememberedView.cardIndex>=0?rememberedView.cardIndex:0,
 flipped:!!rememberedView.flipped,search:'',quiz:null};
function quizKey(l=lesson,stage=UI.stage){return l.number+':'+stage;}
function resumeQuiz(l=lesson){const q=P.quizSessions[quizKey(l)];return q&&Array.isArray(q.items)&&q.items.length&&Number.isInteger(q.index)&&q.index>=0&&q.index<q.items.length&&typeof q.correct==='number'?q:null;}
if(lesson)UI.quiz=resumeQuiz(lesson);
function lastRound(l,stage){return P.quizHistory[l.number+':'+stage]||null;}
function roundLabel(l,stage){
 const h=lastRound(l,stage),q=P.quizSessions[l.number+':'+stage];
 if(h)return '✓ Lượt gần nhất '+h.correct+'/'+h.total+' câu';
 if(q&&Array.isArray(q.items))return 'Đang làm '+(q.index+(q.picked!==null?1:0))+'/'+q.items.length+' câu';
 return 'Chưa có lượt kiểm tra';
}
function storeStudyState(){
 if(!lesson)return;
 P.views[lesson.number]={tab:UI.tab,stage:UI.stage,mode:UI.mode,cardIndex:UI.cardIndex,flipped:UI.flipped};
 if(UI.quiz&&Array.isArray(UI.quiz.items))P.quizSessions[quizKey()]={...UI.quiz};
 save();
}

const bee={happy:'/hsk4/assets/bee-happy-original.webp',wink:'/hsk4/assets/bee-wink.png',thinking:'/hsk4/assets/bee-thinking.png',serious:'/hsk4/assets/bee-serious.png',sad:'/hsk4/assets/bee-sad.png',surprised:'/hsk4/assets/bee-surprised.png'};
function load(){try{const r=JSON.parse(localStorage.getItem(STORE)||'{}');return {memory:r.memory||{},self:r.self||{},grammar:r.grammar||{},quizSessions:r.quizSessions||{},quizHistory:r.quizHistory||{},views:r.views||{}};}catch(_){return {memory:{},self:{},grammar:{},quizSessions:{},quizHistory:{},views:{}};}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(P));}catch(_){}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9\u3400-\u9fff]+/g,' ').trim();}
function pad(n){return String(n).padStart(2,'0');}
function pct(a,n){return n?Math.round(100*a/n):0;}
function wordCorrect(w){return P.memory[w.id]?.lastCorrect===true;}
function wordStats(words){let verified=words.filter(wordCorrect).length,marked=words.filter(w=>P.self[w.id]==='known').length,review=words.filter(w=>P.self[w.id]==='review'||P.memory[w.id]?.lastCorrect===false).length;return {total:words.length,verified,marked,review,pct:pct(verified,words.length)};}
function grammarStats(l){let verified=l.grammar.filter(g=>P.grammar[g.id]==='known').length;return {total:l.grammar.length,verified,pct:pct(verified,l.grammar.length)};}
function stageWords(l,idx){if(idx===-1)return l.words;const n=l.words.length,k=Math.floor(n/4),r=n%4,start=idx*k+Math.min(idx,r);return l.words.slice(start,start+k+(idx<r?1:0));}
function header(){return `<header class="site-header"><div class="site-wrap header-inner"><a class="brand" href="/hsk3/"><span class="brand-mark">中</span><span>HSK3 CLASSROOM<small class="brand-sub">VOCABULARY & GRAMMAR</small></span></a><nav class="header-links" aria-label="Điều hướng"><a href="/hsk3/">10 bài ôn tập</a><a href="/hsk4/">Học HSK4</a><a href="/hsk3/" class="header-cta">Chọn bài ↗</a><button type="button" class="sfx-toggle" data-action="sound-toggle" aria-label="${SFX.enabled?'Tắt':'Bật'} âm thanh đáp án" aria-pressed="${SFX.enabled}"><span aria-hidden="true">${SFX.enabled?'🔊':'🔇'}</span><span class="sfx-label">${SFX.enabled?'Âm bật':'Âm tắt'}</span></button></nav></div></header>`;}
function footer(){return `<footer class="footer"><div class="site-wrap footer-inner"><span>HSK3 Classroom · Ôn tập 1 · Chỉ từ mới và ngữ pháp</span><span><a href="/hsk4/">HSK4 Classroom ↗</a> · Nguồn: PDF 46 trang</span></div></footer>`;}
function meter(title,part,whole,isBlue=false,description=''){return `<div class="meter"><div class="meter-top"><strong>${esc(title)}</strong><b>${pct(part,whole)}%</b></div><div class="progress-track"><div class="progress-fill ${isBlue?'blue':''}" style="width:${pct(part,whole)}%"></div></div><p>${esc(description||`${part}/${whole} đã hoàn thành`)}</p></div>`;}
function hub(){
 const lessonCards=D.lessons.map(l=>{const w=wordStats(l.words),g=grammarStats(l);return `<a class="lesson-card" href="/hsk3/bai-${l.number}/"><div class="lesson-card-top"><span class="lesson-no">BÀI ${pad(l.number)} · TRANG ${pad(l.sourceRange[0])}–${pad(l.sourceRange[1])}</span><span class="lesson-num">${pad(l.number)}</span></div><h3>${esc(l.title)}</h3><p>Từ vựng: trang ${pad(l.vocabPage)} · Ngữ pháp: ${l.grammar.map(t=>pad(t.page)).join(', ')}.</p><div class="lesson-tags"><span class="tag blue">${l.words.length} mục từ</span><span class="tag">${l.grammar.length} chủ điểm</span></div><div class="progress-label">📝 ${esc([0,1,2,3].map(i=>lastRound(l,i)?`Chặng ${i+1}: ${lastRound(l,i).correct}/${lastRound(l,i).total}`:null).filter(Boolean).join(" · ")||"Chưa hoàn thành lượt kiểm tra")}</div><div class="progress-label">字 · Nhớ từ vựng: ${w.verified}/${w.total} (${w.pct}%)</div><div class="progress-track"><div class="progress-fill" style="width:${w.pct}%"></div></div><div class="progress-label">文 · Tự xác nhận ngữ pháp: ${g.verified}/${g.total} (${g.pct}%)</div><div class="progress-track"><div class="progress-fill blue" style="width:${g.pct}%"></div></div><div class="lesson-go">Vào học Bài ${l.number}<span class="go-icon">→</span></div></a>`}).join('');
 const auditRows=D.vocabAudit.map(x=>`<tr><td><a href="/hsk3/bai-${x.lesson}/">Bài ${x.lesson}</a></td><td>Trang ${pad(x.sourceVocabPage)}</td><td>${x.vocabRows} × ${x.vocabCols}</td><td><strong>${x.nonEmptyCells}</strong></td><td>${x.grammarTopics}</td><td>${x.valid?'Đã đối chiếu':'Cần kiểm tra'}</td></tr>`).join('');
 return header()+`<main class="site-wrap"><section class="hero"><div><div class="eyebrow">HSK3 · ÔN TẬP 1 · TÀI LIỆU 46 TRANG</div><h1>Ôn từ mới.<br>Hiểu ngữ pháp.<br><em>Vững từng bài.</em></h1><p>Chia riêng 10 bài học, giữ trọn các mục từ từ bảng gốc và ví dụ ngữ pháp có chữ Hán, pinyin, tiếng Việt. Không đưa bài tập dịch vào website.</p><div class="hero-actions"><a class="btn primary" href="#lessons">Chọn bài để học ↗</a><a class="btn light" href="/hsk4/">Chuyển sang HSK4 →</a></div><div class="hero-pills"><span>Chữ Hán · Pinyin · Nghĩa Việt</span><span>4 chặng mỗi bài</span><span>Tiến độ độc lập</span></div></div><div class="hero-art"><div class="hero-arch"><img src="${bee.happy}" width="340" height="438" alt="Mascot ong vui vẻ" loading="eager"></div></div></section><section class="stats" aria-label="Thống kê nguồn"><div class="stat"><strong>10</strong><small>Bài ôn tập độc lập</small></div><div class="stat"><strong>374</strong><small>Mục từ trong bảng nguồn</small></div><div class="stat"><strong>13</strong><small>Trang / chủ điểm ngữ pháp</small></div><div class="stat"><strong>46</strong><small>Trang PDF đã đối chiếu</small></div></section><section id="lessons"><div class="section-intro"><div><div class="eyebrow">CHỌN BÀI HỌC</div><h2>Ôn tập theo từng bài</h2><p>Vào từng bài để học từ mới theo 4 chặng và xem toàn bộ ngữ pháp trong PDF.</p></div><span class="tag blue">10 BÀI · HỌC RIÊNG BIỆT</span></div><div class="lesson-grid">${lessonCards}</div></section><div class="verify-note"><strong>Cam kết nguồn:</strong> 374 ô từ vựng có nội dung từ 10 bảng PDF, tương ứng 370 mặt chữ Hán khác nhau. Các từ lặp <strong>还 · 过去 · 落 · 着</strong> được giữ ở cả hai bài có xuất hiện; không xóa nghĩa khác nhau. Đây là bộ “Ôn tập 1” theo tài liệu bạn cung cấp, <strong>không tuyên bố là toàn bộ danh mục HSK3 chính thức</strong>. Từ <strong>新浪</strong> ở Bài 10 được giữ theo nguồn và gắn cảnh báo vì chú thích nghi có lỗi.</div><details><summary style="color:var(--blue);font-weight:850;cursor:pointer;margin-bottom:12px">Xem bảng kiểm tra đủ từ theo từng bài</summary><div class="table-scroll"><table class="audit-table"><thead><tr><th>Bài</th><th>Trang từ</th><th>Ô bảng</th><th>Số mục</th><th>Ngữ pháp</th><th>Kiểm tra</th></tr></thead><tbody>${auditRows}</tbody><tfoot><tr><th>Tổng</th><th>10 trang</th><th>Không bỏ ô có nội dung</th><th>374</th><th>13</th><th>Đạt</th></tr></tfoot></table></div></details></main>`+footer();
}
function lessonHeader(l){const w=wordStats(l.words),g=grammarStats(l);return header()+`<main class="site-wrap"><nav class="lesson-nav" aria-label="10 bài HSK3"><a href="/hsk3/">⌂ Tất cả bài</a>${D.lessons.map(x=>`<a href="/hsk3/bai-${x.number}/" class="${x.number===l.number?'active':''}">Bài ${x.number}</a>`).join('')}</nav><section class="intro"><div><div class="eyebrow">HSK3 · ÔN TẬP 1 · BÀI ${pad(l.number)}</div><h1>Từ mới & ngữ pháp</h1><p>${l.words.length} mục từ trang ${pad(l.vocabPage)} · ${l.grammar.length} chủ điểm ngữ pháp ở trang ${l.grammar.map(x=>pad(x.page)).join(', ')} · Đúng thứ tự PDF gốc.</p></div><img src="${bee.happy}" width="110" height="125" alt="Ong chào mừng"></section><div class="lesson-progress">${meter('字 · Từ vựng đã kiểm tra đúng',w.verified,w.total,false,`${w.verified}/${w.total} từ có lần chọn nghĩa gần nhất đúng. Tự đánh dấu thuộc: ${w.marked}.`)}${meter('文 · Ngữ pháp đã hiểu',g.verified,g.total,true,`${g.verified}/${g.total} chủ điểm bạn tự xác nhận hiểu; chưa phải điểm kiểm tra.`)}</div><div class="top-tabs" role="tablist" aria-label="Chọn loại nội dung"><button role="tab" aria-selected="${UI.tab==='vocab'}" class="${UI.tab==='vocab'?'active':''}" data-action="tab" data-value="vocab">字 · Từ mới (${l.words.length})</button><button role="tab" aria-selected="${UI.tab==='grammar'}" class="${UI.tab==='grammar'?'active':''}" data-action="tab" data-value="grammar">文 · Ngữ pháp (${l.grammar.length})</button></div><div id="lessoncontent">${UI.tab==='vocab'?vocabPanel(l):grammarPanel(l)}</div><div class="verify-note"><strong>Ghi chú kiểm soát:</strong> chỉ dùng bảng từ và trang ngữ pháp của “Ôn tập 1”. Những trang bài tập dịch không được đưa vào phần học. Từ có nhiều cách đọc hoặc nghĩa trong các bài khác nhau được lưu theo từng ô nguồn; không tự hợp nhất.</div></main>`+footer();}
function modes(){return `<div class="chips"><button class="chip ${UI.mode==='list'?'active':''}" data-action="mode" data-value="list">▦ Danh sách từ</button><button class="chip ${UI.mode==='flash'?'active':''}" data-action="mode" data-value="flash">▣ Flashcard</button><button class="chip ${UI.mode==='quiz'?'active':''}" data-action="mode" data-value="quiz">◫ 4 ô chọn nghĩa</button></div>`;}
function vocabPanel(l){const words=stageWords(l,UI.stage),st=wordStats(words);let stages='<div class="stage-header"><h2>Học theo 4 chặng</h2><p>Ngắn gọn · Không lẫn bài · Bao phủ đủ '+l.words.length+' mục</p></div><div class="stages">';for(let i=0;i<4;i++){let part=stageWords(l,i),s=wordStats(part);stages+=`<div class="stage ${UI.stage===i?'active':''}"><strong>CHẶNG ${i+1}</strong><small>${part.length} từ · ${s.verified}/${part.length} từ đúng</small><span class="stage-saved">${esc(roundLabel(l,i))}</span><div class="progress-track"><div class="progress-fill" style="width:${s.pct}%"></div></div><div class="stage-per">${s.pct}% ghi nhớ đã kiểm tra</div><div class="stage-actions"><button data-action="stage-flash" data-value="${i}">Học thẻ</button><button data-action="stage-quiz" data-value="${i}">Kiểm tra</button></div></div>`;}stages+='</div>';
 const controls=`<div class="view-controls">${modes()}${UI.mode==='list'?'<input id="wordsearch" class="word-search" type="search" placeholder="Tìm chữ Hán, pinyin, nghĩa Việt" aria-label="Tìm trong danh sách từ">':'<span class="tag blue">Từ vựng từ trang '+pad(l.vocabPage)+'</span>'}</div>`;
 const content=UI.mode==='list'?vocabList(l,words):UI.mode==='flash'?flashPanel(l,words):quizPanel(l,words);
 return `<section><div class="lesson-section-head"><div><h2>Từ vựng Bài ${l.number}</h2><p>${l.words.length} ô nguồn từ trang ${pad(l.vocabPage)}, giữ đúng thứ tự từng hàng và cột.</p></div><img src="${bee.wink}" width="75" height="75" alt="Ong giơ ngón cái"></div>${stages}<div class="flat-note">Bạn đang học <strong>Chặng ${UI.stage+1}</strong>: ${words.length} mục. Đã kiểm tra đúng ${st.verified}/${st.total} từ. Chọn chặng khác hoặc nhấn vào Flashcard / kiểm tra để học đúng nhóm từ.</div>${controls}${content}</section>`;
}
function issueFor(l,w){return D.sourceIssues.find(x=>x.lesson===l.number&&x.word===w.han)||null;}
function vocabList(l,words){return `<div class="word-grid" id="wordgrid">${words.map(w=>{const issue=issueFor(l,w),self=P.self[w.id],verified=wordCorrect(w);return `<article class="word-card" data-wordsearch="${esc(norm(w.han+' '+w.pinyin+' '+w.vi))}"><div class="cn">${esc(w.han)}</div><div class="py">${esc(w.pinyin)}</div><div class="vi">${esc(w.vi)}</div><span class="source">Trang ${pad(w.page)} · hàng ${w.row}, cột ${w.col} ${verified?'· ✓ Trắc nghiệm đúng':''}</span>${issue&&issue.status.includes('cần')?`<div class="source-warning"><b>Cần đối chiếu:</b> ${esc(issue.note)}</div>`:''}<div class="word-actions"><button data-action="word-self" data-id="${w.id}" data-value="known" class="${self==='known'?'active':''}">✓ Đã nhớ</button><button data-action="word-self" data-id="${w.id}" data-value="review" class="review ${self==='review'?'active':''}">↺ Từ khó</button></div></article>`;}).join('')}</div><p class="flat-note">Có <b>${words.length}</b> mục trong chặng, tìm kiếm chỉ lọc hiển thị. Đánh dấu “Đã nhớ” là <b>tự đánh giá</b>; tỷ lệ ghi nhớ kiểm tra chỉ tăng khi chọn đúng nghĩa trong phần 4 ô.</p>`;}
function flashPanel(l,words){if(!words.length)return '<div class="empty">Chặng này chưa có từ.</div>';UI.cardIndex=Math.max(0,Math.min(UI.cardIndex,words.length-1));const w=words[UI.cardIndex];const issue=issueFor(l,w);return `<div class="flashwrap"><div class="flashcount">THẺ ${UI.cardIndex+1}/${words.length} · TRANG ${pad(w.page)} · HÀNG ${w.row} CỘT ${w.col}</div><button class="flash-card" data-action="flip" style="width:100%" aria-label="Lật thẻ flashcard"><div class="hint">${UI.flipped?'ĐÃ LẬT · NHẤN ĐỂ XEM LẠI CHỮ HÁN':'NHỚ NGHĨA RỒI MỚI LẬT'}</div>${UI.flipped?`<div class="big-cn">${esc(w.han)}</div><div class="face-py">${esc(w.pinyin)}</div><div class="face-vi">${esc(w.vi)}</div>`:`<div class="big-cn">${esc(w.han)}</div><div class="hint">Nhấn vào thẻ để xem pinyin và nghĩa</div>`}</button>${issue&&issue.status.includes('cần')?`<div class="source-warning">${esc(issue.note)}</div>`:''}<div class="flash-tools"><button class="btn light" data-action="card-prev">← Thẻ trước</button><button class="btn blue" data-action="flip">${UI.flipped?'Úp thẻ lại':'Lật xem nghĩa'}</button><button class="btn light" data-action="card-next">Thẻ tiếp →</button></div><div class="flash-tools"><button class="btn soft" data-action="word-self" data-id="${w.id}" data-value="review">↺ Chưa thuộc</button><button class="btn primary" data-action="word-self" data-id="${w.id}" data-value="known">✓ Đã nhớ</button></div><div class="flat-note">Flashcard chỉ giúp tự ôn. Sau khi học hết chặng, chọn <b>4 ô chọn nghĩa</b> để tự kiểm tra và tăng tỷ lệ từ vựng đã xác minh.</div></div>`;}
function shuffle(items){let a=items.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function distinctMeanings(a,b){let x=norm(a),y=norm(b);if(!x||!y)return false;if(x===y||x.includes(y)||y.includes(x))return false;return true;}
function optionsFor(w,l){let pool=shuffle(l.words.filter(x=>x.id!==w.id&&x.vi&&distinctMeanings(x.vi,w.vi)));let vals=[w];for(const x of pool){if(vals.length===4)break;if(vals.every(y=>distinctMeanings(y.vi,x.vi)))vals.push(x);}if(vals.length<4){for(const x of shuffle(D.lessons.flatMap(z=>z.words))){if(vals.length===4)break;if(vals.every(y=>distinctMeanings(y.vi,x.vi)))vals.push(x);}}return shuffle(vals.map(x=>({id:x.id,vi:x.vi})));}
function startQuiz(l){const part=stageWords(l,UI.stage);const order=shuffle(part.filter(w=>!wordCorrect(w))).concat(shuffle(part.filter(w=>wordCorrect(w)))).slice(0,10);UI.quiz={items:order.map(w=>({id:w.id,options:optionsFor(w,l)})),index:0,picked:null,correct:0,done:false};UI.mode='quiz';render();}
function quizPanel(l,words){const q=UI.quiz;if(!q)return `<div class="quiz-end"><img src="${bee.serious}" width="100" height="100" alt="Ong nghiêm túc"><h3>Sẵn sàng kiểm tra Chặng ${UI.stage+1}?</h3><p>Chọn nghĩa tiếng Việt đúng của chữ Hán. 4 đáp án đều là nghĩa có trong PDF; không thêm nghĩa ngoài nguồn.</p><button class="btn primary" data-action="quiz-start">Bắt đầu 10 từ →</button></div>`;
 if(q.done)return `<div class="quiz-end"><img src="${q.correct===q.items.length?bee.happy:bee.wink}" width="100" height="100" alt="Ong chúc mừng"><div class="score">${q.correct}/${q.items.length}</div><h3>Hoàn thành lượt kiểm tra! ✓ Đã lưu điểm</h3><p>Chặng ${UI.stage+1}: đã chọn đúng nghĩa gần nhất ${wordStats(words).verified}/${words.length} mục. Từ chọn sai được đưa vào danh sách cần ôn.</p><button class="btn primary" data-action="quiz-start">Kiểm tra những từ còn lại ↗</button></div>`;
 const item=q.items[q.index];const w=l.words.find(x=>x.id===item.id);const isAnswered=q.picked!==null;
 return `<div class="quizwrap"><div class="flashcount">CÂU ${q.index+1}/${q.items.length} · ĐÚNG ${q.correct} · ${q.index} CÂU ĐÃ TRẢ LỜI</div><div class="quiz-card"><div class="quizhead"><div class="hint">TỪ CHỮ HÁN NÀY CÓ NGHĨA GÌ?</div><div class="cn">${esc(w.han)}</div><div class="hint">Bài ${l.number} · Trang ${pad(w.page)}</div></div><div class="quiz-options">${item.options.map((o,i)=>`<button class="quiz-opt ${isAnswered?(o.id===w.id?'correct':o.id===q.picked?'wrong':''):''}" data-action="quiz-answer" data-id="${esc(o.id)}" ${isAnswered?'disabled':''}><span class="letter">${'ABCD'[i]}</span>${esc(o.vi)}</button>`).join('')}</div>${isAnswered?`<div class="quiz-feedback ${q.picked===w.id?'':'wrong'}"><img src="${q.picked===w.id?bee.wink:bee.sad}" alt="Mascot phản hồi"><strong>${q.picked===w.id?'✓ Đúng rồi!':'↺ Cần ôn lại'}</strong><br><b>${esc(w.han)}</b> · ${esc(w.pinyin)}<br>${esc(w.vi)}<br><span class="source">Nguồn: trang ${pad(w.page)}, ô hàng ${w.row}, cột ${w.col}.</span></div>`:''}</div><div class="quizbuttons"><span class="progress-label">Mỗi từ chỉ tính là nhớ khi chọn đúng nghĩa.</span><button class="btn primary" data-action="quiz-next" ${isAnswered?'':'disabled'}>${q.index===q.items.length-1?'Xem kết quả →':'Câu tiếp →'}</button></div></div>`;
}
function grammarPanel(l){return `<section><div class="lesson-section-head"><div><h2>Ngữ pháp Bài ${l.number}</h2><p>Toàn bộ nội dung từ ${l.grammar.length} trang ngữ pháp của tài liệu, giữ đúng thứ tự dòng.</p></div><img src="${bee.thinking}" width="75" height="75" alt="Ong đang suy nghĩ"></div><div class="grammar-stack">${l.grammar.map(g=>{const state=P.grammar[g.id],lines=g.lines.map(x=>`<div class="gline ${esc(x.kind)}">${esc(x.text)}</div>`).join('');return `<article class="grammar-topic"><div class="grammar-top"><div><span class="eyebrow">NGỮ PHÁP · TRANG ${pad(g.page)}</span><h3>${esc(g.title)}</h3></div><span class="tag ${state==='known'?'blue':''}">${state==='known'?'✓ Đã hiểu':state==='review'?'↺ Ôn lại':'Chưa đánh giá'}</span></div><div class="grammar-body">${lines}</div><div class="grammar-actions"><span>Đọc công thức và ví dụ, sau đó tự đánh giá:</span><div class="buttons"><button class="btn small ${state==='known'?'blue':'light'}" data-action="gram-state" data-id="${g.id}" data-value="known">✓ Đã hiểu</button><button class="btn small ${state==='review'?'soft':'light'}" data-action="gram-state" data-id="${g.id}" data-value="review">↺ Cần ôn</button></div></div></article>`;}).join('')}</div><div class="flat-note">Tiến độ ngữ pháp dựa trên <b>tự xác nhận đã hiểu</b> từng trang. Website không suy diễn rằng bạn đã thành thạo nếu chưa làm kiểm tra thực hành.</div></section>`;}
function render(){app.innerHTML=lesson?lessonHeader(lesson):hub();document.title=lesson?`HSK3 · Bài ${lesson.number} · Từ mới & Ngữ pháp`:'HSK3 Classroom · Ôn tập 1 · 10 bài';storeStudyState();}
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='sound-toggle'){SFX.toggle();render();return;}if(!lesson)return;
 const a=b.dataset.action,v=b.dataset.value,id=b.dataset.id;
 if(a==='tab'){UI.tab=v;UI.search='';render();return;}
 if(a==='mode'){UI.mode=v;UI.search='';UI.cardIndex=0;UI.flipped=false;if(v==='quiz'){UI.quiz=resumeQuiz(lesson);if(!UI.quiz){startQuiz(lesson);return;}}render();return;}
 if(a==='stage-flash'||a==='stage-quiz'){UI.stage=Number(v);UI.mode=a==='stage-flash'?'flash':'quiz';UI.cardIndex=0;UI.flipped=false;UI.quiz=resumeQuiz(lesson);if(a==='stage-quiz'&&!UI.quiz){startQuiz(lesson);return;}render();return;}
 if(a==='word-self'){P.self[id]=P.self[id]===v?'':v;save();render();return;}
 if(a==='flip'){UI.flipped=!UI.flipped;render();return;}
 if(a==='card-prev'||a==='card-next'){const words=stageWords(lesson,UI.stage);UI.cardIndex=(UI.cardIndex+(a==='card-next'?1:-1)+words.length)%words.length;UI.flipped=false;render();return;}
 if(a==='quiz-start'){startQuiz(lesson);return;}
 if(a==='quiz-answer'){
  const q=UI.quiz;if(!q||q.done||q.picked!==null)return;const question=q.items[q.index];if(!question.options.some(opt=>opt.id===id))return;q.picked=id;
  const good=id===question.id;q.correct+=good?1:0;SFX.play(good?'correct':'wrong');
  const prev=P.memory[question.id]||{attempts:0,correct:0};P.memory[question.id]={attempts:prev.attempts+1,correct:prev.correct+(good?1:0),lastCorrect:good,lastAt:new Date().toISOString()};
  if(!good)P.self[question.id]='review';save();render();return;
 }
 if(a==='quiz-next'){const q=UI.quiz;if(!q||q.picked===null)return;if(q.index>=q.items.length-1){if(!q.done){q.done=true;const key=quizKey();const old=P.quizHistory[key]||{};P.quizHistory[key]={correct:q.correct,total:q.items.length,best:Math.max(q.correct,old.best||0),rounds:(old.rounds||0)+1,completedAt:new Date().toISOString()};}}else{q.index++;q.picked=null;}render();return;}
 if(a==='gram-state'){P.grammar[id]=P.grammar[id]===v?'':v;save();render();return;}
});
document.addEventListener('input',ev=>{if(ev.target.id!=='wordsearch')return;const search=norm(ev.target.value);for(const card of document.querySelectorAll('#wordgrid .word-card'))card.hidden=!!search&&!card.dataset.wordsearch.includes(search);});
document.addEventListener('keydown',ev=>{if(!lesson)return;if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(UI.tab==='vocab'&&UI.mode==='flash'){if(ev.key==='ArrowRight'){ev.preventDefault();const w=stageWords(lesson,UI.stage);UI.cardIndex=(UI.cardIndex+1)%w.length;UI.flipped=false;render();}if(ev.key==='ArrowLeft'){ev.preventDefault();const w=stageWords(lesson,UI.stage);UI.cardIndex=(UI.cardIndex+w.length-1)%w.length;UI.flipped=false;render();}if(ev.key===' '){ev.preventDefault();UI.flipped=!UI.flipped;render();}}else if(UI.tab==='vocab'&&UI.mode==='quiz'&&UI.quiz&&!UI.quiz.done){const q=UI.quiz;if(/^[1-4]$/.test(ev.key)&&q.picked===null){const option=q.items[q.index].options[Number(ev.key)-1];if(option){ev.preventDefault();document.querySelector(`[data-action="quiz-answer"][data-id="${option.id}"]`)?.click();}}if(ev.key==='Enter'&&q.picked!==null){ev.preventDefault();document.querySelector('[data-action="quiz-next"]')?.click();}}});
render();
})();
