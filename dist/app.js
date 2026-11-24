const STORE = 'chengcheng-workbench-v1';
// 家庭固定周模板：新设备首次打开自动带入，之后可在「设置—一周安排」里改
const weeklyTemplate={0:[['17:50','18:30','到家 · 老人陪伴','家庭',false],['18:30','19:10','学校作业（约60分钟）','学校',false],['19:30','20:30','爸爸奥数','数学',false],['21:00','','整理书包、桌面，准备明天','习惯',false]],1:[['17:50','18:30','到家 · 老人陪伴','家庭',false],['18:30','19:10','学校作业（约60分钟）','学校',false],['19:30','20:30','爸爸奥数','数学',false],['21:00','','整理书包、桌面，准备明天','习惯',false]],2:[['17:50','18:30','到家 · 老人陪伴','家庭',false],['18:50','20:00','线上泉灵课','语文',false],['20:30','21:00','昂立作业','英语',false],['21:00','','整理书包、桌面，准备明天','习惯',false]],3:[['16:45','','到家','家庭',false],['17:00','18:00','学校作业（约60分钟）','学校',false],['18:30','19:00','晚饭','家庭',false],['19:30','20:30','爸爸奥数','数学',false],['21:00','','整理书包、桌面，准备明天','习惯',false]],4:[['16:00','18:00','舞蹈','活动',false],['18:30','19:00','晚饭','家庭',false],['19:30','20:30','爸爸奥数','数学',false],['21:00','','整理书包、桌面，准备明天','习惯',false]],5:[['08:30','10:00','架子鼓','活动',false],['17:00','17:15','英文绘本','英语',false],['18:50','20:00','线上语文','语文',false]],6:[['10:00','11:00','爸爸奥数','数学',false],['15:00','18:00','昂立英语','英语',false]]};
const cloneTemplate=()=>JSON.parse(JSON.stringify(weeklyTemplate));
const defaultData = {tasks:cloneTemplate(),days:{},custom:[],mistakes:[],history:[],homeworkWeeks:{},settings:{weekdayCare:'待确认',backupCare:'待确认',pickupNote:'',wakeTime:'07:00',sleepTime:'21:00'}};
let data=JSON.parse(localStorage.getItem(STORE)||'null')||JSON.parse(JSON.stringify(defaultData));
data.history=data.history||[]; data.mistakes=data.mistakes||[]; data.english=data.english||{};
// tasks = 固定周模板（按星期几）；days = 某一天（YYYY-MM-DD）的临时覆盖
data.tasks=Object.assign({0:[],1:[],2:[],3:[],4:[],5:[],6:[]},data.tasks||{});
data.days=data.days||{}; data.custom=data.custom||[]; data.homeworkWeeks=data.homeworkWeeks||{}; data.settings=data.settings||{};
const inferEnd=(start,title)=>{const minutes=/到家/.test(title)?40:/晚餐/.test(title)?30:/学校作业/.test(title)?60:/爸爸奥数/.test(title)?30:/线上语文/.test(title)?70:/英语听力|英文绘本/.test(title)?15:/单词复习/.test(title)?10:/舞蹈/.test(title)?120:/架子鼓/.test(title)?90:/昂立英语/.test(title)?180:/昂立课后作业/.test(title)?30:0;if(!minutes||!/^\d{2}:\d{2}$/.test(start))return '';const [h,m]=start.split(':').map(Number),total=h*60+m+minutes;return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`};
const normalizeTask=t=>Array.isArray(t)&&t.length>=5?[t[0]||'',t[1]||'',t[2]||'',t[3]||'活动',!!t[4]]:[t?.[0]||'',inferEnd(t?.[0]||'',t?.[1]||''),t?.[1]||'',t?.[2]||'活动',!!t?.[3]];
Object.keys(data.tasks).forEach(k=>{data.tasks[k]=(data.tasks[k]||[]).map(normalizeTask)});Object.keys(data.days).forEach(k=>{data.days[k]=(data.days[k]||[]).map(normalizeTask)});
// 已经用空数据打开过的设备：全周没有任何安排、又从未套用过模板时，自动带入家庭固定模板
const hasAnySchedule=()=>Object.values(data.tasks||{}).some(list=>Array.isArray(list)&&list.length);
if(!hasAnySchedule()&&!data.settings.weekTemplateApplied){data.tasks=cloneTemplate();data.settings.weekTemplateApplied=true;localStorage.setItem(STORE,JSON.stringify(data))}
const save=()=>localStorage.setItem(STORE,JSON.stringify(data));
function toast(message){let el=document.getElementById('ccToast');if(!el){el=document.createElement('div');el.id='ccToast';el.className='cc-toast';document.body.appendChild(el)}el.textContent=message;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),1900)}
let today=new Date(); let day=(today.getDay()+6)%7; const cnDays=['周一','周二','周三','周四','周五','周六','周日'];
const pad2=n=>String(n).padStart(2,'0');
const keyOf=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const weekdayOf=d=>(d.getDay()+6)%7;
const parseKey=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const todayKey=()=>keyOf(today);
function refreshDateIfChanged(){
  const now=new Date();
  if(keyOf(now)===keyOf(today))return false;
  today=now;
  day=(today.getDay()+6)%7;
  weekOffset=0;
  weekEdit=false;
  keepWeekEdit=false;
  renderToday();
  renderWeek();
  renderHomework(false);
  renderGrowth();
  renderPoints();
  return true;
}
// ── 每日一句 ───────────────────────────────────────────────
// 主句 = 鼓励 / 成语 / 谚语；小字 = 意译的英文表达（不逐字翻译，求语气相通）
// 取句用「日期序号 % 池长」：同一天刷新不变、隔天必换，且能把整池走完不重复
const DAILY_LINES={
  // 上学日：起步、方法、成语
  work:[
    ['先做第一件，后面的会跟上。','Start with one thing. The rest will follow.'],
    ['慢慢来，比较快。','Slow is smooth; smooth is fast.'],
    ['一次只做一件事。','One thing at a time.'],
    ['不会的，正好是能学会的。','What you cannot do yet is what you are about to learn.'],
    ['不积跬步，无以至千里。','A thousand miles begins with a single step.'],
    ['把会做的先做掉，心就稳了。','Do the easy ones first, and your mind will settle.'],
    ['认真做完一件，胜过匆匆忙忙做三件。','One thing done well beats three done in a rush.'],
    ['磨刀不误砍柴工。','Sharpen the axe before you chop the wood.'],
    ['读三遍，胜过记十遍。','Reading it three times beats memorizing it ten.'],
    ['写字慢一点，就不用擦了。','Write a little slower, and erase a little less.'],
    ['提前五分钟，心里就不慌。','Five minutes early means no panic.'],
    ['先做完，再做好。','Get it done, then get it good.'],
    ['疑问写在本子上，别留在心里。','Write your questions down. Do not keep them in your head.'],
    ['想不起来，就翻回去看一眼。','If you forget, look back. That is allowed.'],
    ['熟能生巧。','Practice makes perfect.'],
    ['温故而知新。','Review the old, and learn the new.'],
    ['不怕慢，就怕站。','Do not fear slow; fear standing still.'],
    ['手比眼睛学得快。','Your hands learn faster than your eyes.'],
    ['一步一步走，路自己会变短。','Step by step, the road shortens itself.'],
    ['小事做好，大事不难。','Small things done well make big things easy.'],
    ['今日事，今日毕。','Finish today what belongs to today.'],
    ['自己安排的，记得更牢。','What you plan yourself, you remember longer.'],
    ['今天做对一件，就很好。','One thing done right today is enough.'],
    ['会等，也是一种本事。','Knowing how to wait is a skill too.'],
    ['错了就改，改了就记住。','Fix the mistake, and it stays with you.'],
    ['先看清，再下笔。','Look closely before you write.'],
    ['涓涓细流，汇成江海。','Little streams make a river.'],
    ['每天一点点，就是了不起。','A little every day adds up.']
  ],
  // 周末与假日：休息、自主、诗句
  rest:[
    ['今天先玩，也是安排的一部分。','Playing today is part of the plan.'],
    ['休息好了，才能跑得更远。','Rest well, and you will run farther.'],
    ['读闲书，不算浪费时间。','Reading for fun is never wasted time.'],
    ['一张一弛，文武之道。','Work and rest both matter.'],
    ['想做什么，自己决定就好。','You get to decide what today looks like.'],
    ['会玩的人，也会学。','Those who play well learn well too.'],
    ['今天的目标：玩得开心。','Today, the goal is simply to have a good time.'],
    ['慢下来的日子，也在长个子。','Slow days help you grow too.'],
    ['春天播种，秋天才有得收。','Sow in spring, and harvest in autumn.'],
    ['睡饱了，明天才有力气。','Good sleep makes a strong tomorrow.'],
    ['天光正好，出去走走。','The light is good. Go outside.'],
    ['不着急，慢慢长大。','No rush. Grow at your own pace.']
  ]
};
function dailyLine(d=today){
  const stamp=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  const idx=Math.round((stamp-Date.UTC(2026,0,1))/86400000);
  const pool=weekdayOf(d)>=5?DAILY_LINES.rest:DAILY_LINES.work;
  return pool[((idx%pool.length)+pool.length)%pool.length];
}
// 模板永不记录“已完成”，避免上周末的勾选带到下一周
const timeLabel=t=>t[1]?`${t[0]}—${t[1]}`:t[0]||'待安排';
const templateFor=key=>(data.tasks[weekdayOf(parseKey(key))]||[]).map(t=>[t[0],t[1],t[2],t[3],false]);
const tasksFor=key=>Array.isArray(data.days[key])?data.days[key]:templateFor(key);
const hasOverride=key=>Array.isArray(data.days[key]);
function ensureDay(key){if(!Array.isArray(data.days[key]))data.days[key]=templateFor(key);return data.days[key]}
const todayTasks=()=>tasksFor(todayKey());
// 老版本里"自己的事"只存了一份、会跨天残留，迁移到今天这一天的安排里
if(data.custom.length){const list=ensureDay(todayKey());data.custom.forEach(c=>list.push([c.start||c.time||'',c.end||'',c.title,c.tag||'自己的事',!!c.done]));data.custom=[];save()}
document.getElementById('todayLabel').textContent=`今天 · ${today.getMonth()+1}月${today.getDate()}日 ${cnDays[day]}`;
function syncHistory(){const list=todayTasks(),completed=list.filter(t=>t[4]),old=data.history.find(x=>x.date===todayKey()),record={date:todayKey(),label:`${today.getMonth()+1}月${today.getDate()}日 · ${cnDays[day]}`,completed:completed.length,total:list.length,items:completed.map(t=>t[2]),note:old?.note||''};if(old)Object.assign(old,record);else data.history.unshift(record);data.history=data.history.slice(0,30);save()}
const taskSig=list=>JSON.stringify((list||[]).map(t=>[t[0],t[1],t[2],t[3]]));
const hasContentOverride=key=>Array.isArray(data.days[key])&&taskSig(data.days[key])!==taskSig(templateFor(key));
function updateTodayAdjust(){const restore=document.getElementById('restoreToday');if(!restore)return;restore.classList.toggle('hidden',!hasContentOverride(todayKey()))}
function renderToday(){const key=todayKey(),list=tasksFor(key),el=document.getElementById('todayTasks'),line=dailyLine();const todayLabelEl=document.getElementById('todayLabel');if(todayLabelEl)todayLabelEl.textContent=`今天 · ${today.getMonth()+1}月${today.getDate()}日 ${cnDays[day]}`;const lineEl=document.getElementById('dayLine');if(lineEl)lineEl.textContent=line[0];el.innerHTML=list.length?list.map((t,i)=>`<div class="task-item ${t[4]?'done':''}"><button class="check" data-task="${i}" aria-label="${t[4]?'取消完成':'标记完成'}：${t[2]}">${t[4]?"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12.6 9.7 17.2 19 7.8'/></svg>":''}</button><span class="task-time">${timeLabel(t)}</span><span class="task-title">${t[2]}</span><span class="tag ${t[3]==='英语'?'green':''}">${t[3]}</span></div>`).join(''):'<div class="empty-state">今天没有安排，去玩一会儿吧。</div>';el.classList.toggle('is-scrollable',el.scrollHeight>el.clientHeight+2);el.querySelectorAll('[data-task]').forEach(btn=>btn.onclick=()=>{const live=ensureDay(key),i=Number(btn.dataset.task);if(!live[i])return;live[i][4]=!live[i][4];syncTaskPoints(key,live[i]);save();renderToday();renderWeek()});const next=list.find(t=>!t[4]);document.getElementById('nextEvent').innerHTML=next?`<div class="next-time">${timeLabel(next)}</div><div class="next-title">${next[2]}</div><div class="next-sub">${next[3]} · 做完就休息</div>`:'<div class="next-time">完成啦</div><div class="next-title">今天的安排都做好了</div><div class="next-sub">可以放心去玩或阅读</div>';const done=list.filter(t=>t[4]).length;const progress=document.getElementById('taskProgress');if(progress)progress.textContent=list.length?`${done} / ${list.length} 已完成`:'今天没有任务';document.getElementById('dayMood').innerHTML=`<span class="en">${line[1]}</span>${done?`<span class="hero-done">${done} / ${list.length} done</span>`:''}`;updateTodayAdjust();syncHistory()}
let weekOffset=0,weekEdit=false,keepWeekEdit=false;
const weekStart=()=>{const b=new Date(today);b.setDate(today.getDate()-day+weekOffset*7);return b};
function weekKeys(){const b=weekStart(),out=[];for(let i=0;i<7;i++){const d=new Date(b);d.setDate(b.getDate()+i);out.push(keyOf(d))}return out}
const homeworkTypes=[['昂立英语','本周课程与课后作业','🟠'],['架子鼓','本周练习曲目与要求','🟢'],['舞蹈','本周动作练习与老师提醒','🟡']];
function homeworkForWeek(){const key=weekKeys()[0];if(!data.homeworkWeeks[key])data.homeworkWeeks[key]={};return data.homeworkWeeks[key]}
function ensureHomeworkSettings(){const family=document.getElementById('familyView');if(!family||document.getElementById('homeworkSettingsCards'))return;const block=document.createElement('div');block.className='homework-settings';block.innerHTML='<div class="schedule-settings-head"><div><h3>本周课外作业</h3><p>家长在这里更新昂立英语、架子鼓和舞蹈作业，孩子页面只负责查看。</p></div><span id="homeworkSettingsStatus" class="homework-settings-status">本周还没有上传附件</span></div><div id="homeworkSettingsCards" class="homework-settings-grid"></div>';family.querySelector('.schedule-settings')?.after(block)}
const HW_NOTE_RE=/^[\u{1F53A}\u{1F4A1}\u{1F49C}\u{2764}\u{1F4CC}\u{1F514}\u{1F31F}\u{1F60A}\u26A0]/u;
const HW_EMOJI_RE=/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/u;
const HW_HEAD_RE=/^[一二三四五六七八九十]+\s*[、.．]/;
const HW_MARK_RE=/^(?:\d{1,2}\s*[.、．)）]\s*|\d\ufe0f?\u20e3\s*|[（(]\d{1,2}[)）]\s*|[①②③④⑤⑥⑦⑧⑨⑩]\s*|[•·]\s*|[-*]\s+)/;
const hwHash=text=>{let h=0;for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))|0;return (h>>>0).toString(36)};
function hwEsc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function parseHomework(text){
  const out=[];
  String(text||'').split(/\r?\n/).forEach(raw=>{
    const line=raw.replace(/^[\s\u3000]+|[\s\u3000]+$/g,'');
    if(!line)return;
    const last=out[out.length-1];
    if(HW_MARK_RE.test(line)){const rest=line.replace(HW_MARK_RE,'').trim();out.push({type:'task',text:rest||line});return}
    if(HW_HEAD_RE.test(line)){out.push({type:'head',text:line});return}
    if(HW_NOTE_RE.test(line)){out.push({type:'note',text:line});return}
    if(HW_EMOJI_RE.test(line)){out.push({type:'head',text:line});return}
    if(last&&(last.type==='task'||last.type==='note')){last.text+=' '+line;return}
    out.push({type:'task',text:line});
  });
  return out;
}
function homeworkParse(week,i){
  const done=(week[i]||{}).done||{};
  let n=0;
  const blocks=parseHomework((week[i]||{}).text||'');
  blocks.forEach(b=>{if(b.type==='task'){b.hash=hwHash(b.text+'#'+n);b.done=!!done[b.hash];n++}});
  return {blocks,total:n,done:blocks.filter(b=>b.type==='task'&&b.done).length};
}
function homeworkBlocksHtml(week,i){
  const {blocks,total,done}=homeworkParse(week,i);
  if(!blocks.length)return '<div class="hw-empty">家长还没有更新本周内容</div>';
  const bar=total?`<div class="hw-progress"><i style="width:${Math.round(done/total*100)}%"></i><span>已完成 ${done} / ${total}</span></div>`:'';
  return bar+blocks.map(b=>b.type==='head'
    ?`<div class="hw-section">${hwEsc(b.text)}</div>`
    :b.type==='note'
      ?`<div class="hw-note">${hwEsc(b.text)}</div>`
      :`<button class="hw-task${b.done?' done':''}" data-hw-type="${i}" data-hw-hash="${b.hash}" aria-pressed="${b.done}"><span class="hw-check"><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12.6 9.7 17.2 19 7.8'/></svg></span><span class="hw-text">${hwEsc(b.text)}</span></button>`).join('');
}
function homeworkStats(week,i){const s=homeworkParse(week,i);return {tasks:s.total,done:s.done}}
function renderHomework(editable=false){const week=homeworkForWeek(),targetId=editable?'homeworkSettingsCards':'homeworkCards',cards=document.getElementById(targetId);if(!cards)return;cards.innerHTML=homeworkTypes.map((type,i)=>editable?`<article class="homework-card"><div class="homework-card-head"><span class="homework-emoji">${type[2]}</span><div><h3>${type[0]}</h3><p>${type[1]}</p></div></div><textarea data-homework-text="${i}" maxlength="300" placeholder="家长把本周作业写在这里…"></textarea><div class="hw-count" data-hw-count="${i}">写完后会自动拆成可勾选的任务</div><label class="homework-upload">＋ 上传本周资料<input type="file" data-homework-file="${i}" accept="image/*,.pdf,.doc,.docx,.txt" /></label><div class="homework-file" data-homework-name="${i}">${week[i]?.fileName||'还没有附件'}</div></article>`:`<article class="homework-card homework-card-readonly"><div class="homework-card-head"><span class="homework-emoji">${type[2]}</span><div><h3>${type[0]}</h3><p>${type[1]}</p></div></div><div class="hw-blocks">${homeworkBlocksHtml(week,i)}</div><div class="homework-file" data-homework-name="${i}">${week[i]?.fileName?`已上传：${week[i].fileName}`:'本周还没有资料'}</div></article>`).join('');if(editable){cards.querySelectorAll('[data-homework-text]').forEach(input=>{const idx=Number(input.dataset.homeworkText);const refreshCount=()=>{const badge=cards.querySelector('[data-hw-count="'+idx+'"]');if(!badge)return;const st=homeworkStats(week,idx);badge.textContent=st.tasks?'已识别 '+st.tasks+' 条任务，孩子端可以直接点':'写完后会自动拆成可勾选的任务'};input.value=week[idx]?.text||'';refreshCount();input.oninput=()=>{week[idx]={...(week[idx]||{}),text:input.value};save();refreshCount()}});cards.querySelectorAll('[data-homework-file]').forEach(input=>input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const i=Number(input.dataset.homeworkFile),fileId=await putMedia(file);week[i]={...(week[i]||{}),fileId,fileName:file.name};save();renderHomework(true);renderHomework(false)}catch(error){alert('附件暂时没有保存成功，请稍后重试')}})}else cards.querySelectorAll('[data-hw-type]').forEach(btn=>{btn.onclick=()=>{const i=Number(btn.dataset.hwType),h=btn.dataset.hwHash,item=week[i]||(week[i]={});item.done=item.done||{};if(item.done[h])delete item.done[h];else item.done[h]=true;syncHomeworkPoints(i,h,!!item.done[h],btn);save();renderHomework(false)}});const attachmentCount=homeworkTypes.filter((_,i)=>week[i]?.fileName).length;const status=document.getElementById(editable?'homeworkSettingsStatus':'homeworkStatus');if(status)status.textContent=attachmentCount?`本周已上传 ${attachmentCount} 份资料`:'本周还没有上传附件'}
function renderWeek(){const base=weekStart(),end=new Date(base);end.setDate(base.getDate()+6);const range=document.getElementById('weekRange');if(!range)return;range.textContent=`${weekOffset===0?'本周 · ':weekOffset===1?'下周 · ':weekOffset===-1?'上周 · ':''}${base.getMonth()+1}月${base.getDate()}日—${end.getMonth()+1}月${end.getDate()}`;const cards=document.getElementById('weekCards');cards.classList.toggle('editing',weekEdit);const keys=weekKeys();cards.innerHTML=keys.map((k,i)=>{const d=parseKey(k),list=tasksFor(k),ov=hasOverride(k),isToday=k===todayKey();const dayPts=pointsOn(k);const head=`<div class="day-card-top"><div><div class="day-name">${cnDays[i]}</div><div class="day-number">${d.getDate()}</div></div>${dayPts?`<span class="day-pts">+${dayPts}</span>`:''}</div>`;if(weekEdit){const rows=list.length?list.map((t,j)=>`<div class="day-edit-row"><input class="row-time" value="${escapeAttr(t[0])}" data-day-key="${k}" data-row="${j}" data-field="0" placeholder="17:50" aria-label="开始时间"><input class="row-end" value="${escapeAttr(t[1])}" data-day-key="${k}" data-row="${j}" data-field="1" placeholder="结束时间" aria-label="结束时间"><input class="row-title" value="${escapeAttr(t[2])}" data-day-key="${k}" data-row="${j}" data-field="2" placeholder="安排内容" aria-label="安排内容"><input class="row-tag" value="${escapeAttr(t[3])}" data-day-key="${k}" data-row="${j}" data-field="3" placeholder="类别" aria-label="类别"><button class="delete-day-task" data-del-key="${k}" data-row="${j}" aria-label="删除这一项">×</button></div>`).join(''):'<div class="schedule-empty">这一天还没有安排</div>';return `<div class="day-card ${isToday?'today':''} ${ov?'adjusted':''}" data-day-card="${k}">${head}${rows}<div class="day-edit-actions"><button class="mini-btn" data-add-key="${k}">＋ 加一项</button>${ov?`<button class="mini-btn ghost" data-restore-key="${k}">恢复固定</button>`:''}</div></div>`}const items=list.length?list.map(t=>`<div class="day-item"><strong>${timeLabel(t)} · ${t[3]}</strong>${t[2]}</div>`).join(''):'<div class="day-item empty">没有安排</div>';return `<div class="day-card ${isToday?'today':''} ${ov?'adjusted':''}" data-day-card="${k}">${head}${items}</div>`}).join('');bindWeekEditor(cards);const backBtn=document.getElementById('backThisWeek');if(backBtn)backBtn.classList.toggle('hidden',weekOffset===0);const restoreBtn=document.getElementById('restoreWeek');if(restoreBtn)restoreBtn.classList.toggle('hidden',!keys.some(hasContentOverride))}updateTodayAdjust()
function focusDayCard(key){const card=document.querySelector(`[data-day-card="${key}"]`);if(!card)return;card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('flash');setTimeout(()=>card.classList.remove('flash'),2200)}
function restoreWeekOverrides(){const keys=weekKeys().filter(hasOverride);if(!keys.length)return;if(!confirm('这一周的临时调整会全部取消，回到固定模板。确定吗？'))return;keys.forEach(k=>{delete data.days[k]});save();renderWeek();renderToday();toast('已回到固定模板')}
function restoreTodayOverride(){const key=todayKey();if(!hasOverride(key))return;delete data.days[key];save();renderWeek();renderToday();toast('今天已回到固定模板')}
function bindWeekTools(){const rw=document.getElementById('restoreWeek');if(rw)rw.onclick=restoreWeekOverrides;const rt=document.getElementById('restoreToday');if(rt)rt.onclick=restoreTodayOverride;const pw=document.getElementById('prevWeek');if(pw)pw.onclick=()=>shiftWeek(-1);const nw=document.getElementById('nextWeek');if(nw)nw.onclick=()=>shiftWeek(1);const bw=document.getElementById('backThisWeek');if(bw)bw.onclick=()=>{weekOffset=0;weekEdit=false;keepWeekEdit=false;renderWeek()};updateTodayAdjust()}
function bindWeekEditor(cards){cards.querySelectorAll('[data-add-key]').forEach(b=>b.onclick=()=>{const k=b.dataset.addKey;ensureDay(k).push(['','','新安排','活动',false]);save();renderWeek()});cards.querySelectorAll('[data-del-key]').forEach(b=>b.onclick=()=>{const list=ensureDay(b.dataset.delKey);list.splice(Number(b.dataset.row),1);save();renderWeek();renderToday()});cards.querySelectorAll('[data-restore-key]').forEach(b=>b.onclick=()=>restoreDay(b.dataset.restoreKey));cards.querySelectorAll('[data-day-key]').forEach(input=>input.addEventListener('change',()=>{const k=input.dataset.dayKey,row=ensureDay(k)[Number(input.dataset.row)];if(!row)return;row[Number(input.dataset.field)]=input.value;save();renderToday();renderWeek()}))}
function restoreDay(key){if(!hasOverride(key))return;const d=parseKey(key);if(!confirm(`${d.getMonth()+1}月${d.getDate()}日（${cnDays[weekdayOf(d)]}）的临时调整会取消，回到固定模板。确定吗？`))return;delete data.days[key];save();renderWeek();renderToday();toast('已恢复固定安排')}
/* ===== 一周页：翻周 / 跳到某一周 ===== */
function shiftWeek(n){weekOffset+=n;weekEdit=false;keepWeekEdit=false;renderWeek()}
function jumpToWeek(value){if(!value)return;const d=parseKey(value),base=new Date(today.getFullYear(),today.getMonth(),today.getDate()-day);weekOffset=Math.floor(Math.round((d-base)/86400000)/7);weekEdit=false;keepWeekEdit=false;renderWeek()}
/* ===== 记一件事到某一天：从一周页右侧的日历按钮进来 ===== */
function dayWeekOffset(key){const base=new Date(today.getFullYear(),today.getMonth(),today.getDate()-day);return Math.floor(Math.round((parseKey(key)-base)/86400000)/7)}
function openDayEvent(){
  const modal=document.getElementById('dayEventModal');if(!modal)return;
  const dateEl=document.getElementById('dayEventDate');
  if(dateEl)dateEl.value=weekOffset===0?todayKey():keyOf(weekStart());
  ['dayEventStart','dayEventEnd','dayEventTitle'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const tag=document.getElementById('dayEventTag');if(tag)tag.value='活动';
  updateDayEventHint();
  modal.classList.remove('hidden');
  if(dateEl)setTimeout(()=>{try{dateEl.focus({preventScroll:true})}catch(e){}},60);
}
function updateDayEventHint(){
  const hint=document.getElementById('dayEventHint');if(!hint)return;
  const dateEl=document.getElementById('dayEventDate'),v=dateEl&&dateEl.value;
  if(!v){hint.textContent='先选一天，再看这一天已经有什么。';return}
  const d=parseKey(v),n=tasksFor(v).length;
  hint.textContent=`${d.getMonth()+1}月${d.getDate()}日（${cnDays[weekdayOf(d)]}）现在有 ${n} 项安排；记进去会按时间自动排好，不动原来的。`;
}
function saveDayEvent(){
  const dateEl=document.getElementById('dayEventDate'),startEl=document.getElementById('dayEventStart'),endEl=document.getElementById('dayEventEnd'),titleEl=document.getElementById('dayEventTitle'),tagEl=document.getElementById('dayEventTag');
  const key=(dateEl&&dateEl.value)||'',title=((titleEl&&titleEl.value)||'').trim();
  if(!key)return toast('先选一天');
  if(!title)return toast('写一句要做什么');
  let start=((startEl&&startEl.value)||'').trim(),end=((endEl&&endEl.value)||'').trim();
  if(start&&end&&end<start)end='';
  const tag=((tagEl&&tagEl.value)||'').trim()||'活动';
  const list=ensureDay(key);
  list.push([start,end,title,tag,false]);
  list.sort((a,b)=>{const x=a[0]||'99:99',y=b[0]||'99:99';return x<y?-1:x>y?1:0});
  const wk=dayWeekOffset(key);
  if(wk!==weekOffset){weekOffset=wk;weekEdit=false;keepWeekEdit=false}
  save();
  document.getElementById('dayEventModal').classList.add('hidden');
  renderWeek();renderToday();
  const d=parseKey(key);
  toast(`已记到 ${d.getMonth()+1}月${d.getDate()}日：${start?start+' ':''}${title}`);
  if(document.getElementById('weekView')&&!document.getElementById('weekView').classList.contains('hidden'))focusDayCard(key);
}
function bindDayEvent(){
  const btn=document.getElementById('weekCalendar');if(btn)btn.onclick=openDayEvent;
  const close=document.querySelector('[data-close="dayEventModal"]');if(close)close.onclick=()=>document.getElementById('dayEventModal').classList.add('hidden');
  const dateEl=document.getElementById('dayEventDate');if(dateEl)dateEl.onchange=updateDayEventHint;
  const saveBtn=document.getElementById('saveDayEvent');if(saveBtn)saveBtn.onclick=saveDayEvent;
  const jump=document.getElementById('jumpDayOnly');
  if(jump)jump.onclick=()=>{const v=document.getElementById('dayEventDate').value;if(!v)return toast('先选一天');jumpToWeek(v);document.getElementById('dayEventModal').classList.add('hidden')};
}
const ENGLISH_GOALS=[['🎧','英语听力','10分钟 · 每周5—6次',5],['📖','英文绘本','10—15分钟 · 每周3次',3],['✦','单词复习','5—8分钟 · 每周4次',4]];
const englishTodayCount=i=>{const rec=data.english[todayKey()];return Array.isArray(rec)?(Number(rec[i])||0):0};
const englishWeekCount=i=>{const b=new Date(today);b.setDate(today.getDate()-day);let n=0;for(let k=0;k<7;k++){const d=new Date(b);d.setDate(b.getDate()+k);const rec=data.english[keyOf(d)];if(Array.isArray(rec))n+=Number(rec[i])||0}return n};
function renderEnglish(){
  const el=document.getElementById('englishCards');
  if(!el)return;
  el.innerHTML=ENGLISH_GOALS.map((x,i)=>{
    const week=englishWeekCount(i),goal=x[3],pct=goal?Math.min(100,Math.round(week/goal*100)):0,today=englishTodayCount(i);
    return `<article class="learning-card"><div class="learning-icon">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}<br/>本周已完成 ${week} 次</p><div class="progress"><i style="width:${pct}%"></i></div><button data-english="${i}">${today?`今天已完成 ${today} 次 →`:'今天完成一小次 →'}</button></article>`;
  }).join('');
  el.querySelectorAll('[data-english]').forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.english),key=todayKey();
    const rec=Array.isArray(data.english[key])?data.english[key].slice():[0,0,0];
    while(rec.length<3)rec.push(0);
    rec[i]=(Number(rec[i])||0)+1;
    data.english[key]=rec;
    save();renderEnglish();
    awardEnglishPoints(i, true);
  });
}
async function renderMistakes(){const el=document.getElementById('mistakeList');if(!data.mistakes.length){el.innerHTML='<div class="empty-state">还没有错题。发现不会的，拍下来就好。</div>';return}el.innerHTML=data.mistakes.map((m,i)=>`<article class="mistake-card ${m.photoId?'has-media':''}"><div class="mistake-photo-wrap ${m.photoId?'':'hidden'}"><img data-mistake-photo="${i}" alt="${m.subject||'错题'}照片" /></div><div class="mistake-content"><div class="mistake-title-row"><h3>${m.subject}</h3><span class="mistake-meta">${m.date}</span></div><p>${m.text}</p>${m.learning?`<div class="mistake-learning"><span>这次我学到了</span>${m.learning}</div>`:''}</div><button class="remove-mistake" data-remove="${i}" aria-label="删除这道错题">删除</button></article>`).join('');for(const image of el.querySelectorAll('[data-mistake-photo]')){const item=data.mistakes[Number(image.dataset.mistakePhoto)];try{const blob=await getMedia(item.photoId);if(blob)image.src=URL.createObjectURL(blob);else image.closest('.mistake-photo-wrap').classList.add('hidden')}catch(error){image.closest('.mistake-photo-wrap').classList.add('hidden')}}el.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{data.mistakes.splice(Number(b.dataset.remove),1);save();renderMistakes()})}
function renderGrowth(){
  const total=data.history.reduce((n,x)=>n+x.completed,0),days=data.history.filter(x=>x.completed>0).length;
  const bal=pointsBalance(),earned=pointsEarned();
  document.getElementById('growthSummary').innerHTML=`<div class="growth-number">${total}</div><div class="growth-copy"><b>件小事，已经被你完成</b><p>你在 ${days} 天里留下了自己的脚印，一共攒下 ${earned} 分${bal!==earned?`，现在还剩 ${bal} 分`:''}。每一次勾选，都是在照顾自己的节奏。</p></div>`;
  const noteEl=document.getElementById('growthNote');
  if(noteEl&&document.activeElement!==noteEl)noteEl.value=data.history.find(x=>x.date===todayKey())?.note||'';
  renderGrowthLedger();
}
function showView(name){document.querySelectorAll('main>section').forEach(s=>s.classList.add('hidden'));if(name==='today'){['todayView','todayScheduleView','todayQuickNav'].forEach(id=>document.getElementById(id)?.classList.remove('hidden'));renderToday()}else document.getElementById(name+'View').classList.remove('hidden');document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='week'){if(!keepWeekEdit)weekEdit=false;keepWeekEdit=false;renderWeek()}if(name==='chinese'){}if(name==='homework')renderHomework(false);if(name==='family'){ensureHomeworkSettings();renderHomework(true)}if(name==='english')renderEnglish();if(name==='mistakes')renderMistakes();if(name==='growth')renderGrowth();if(name==='points')renderPoints()}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const v=b.dataset.view;if(v==='family'){enterFamily();return}parentUnlocked=false;showView(v)});
document.getElementById('addTask').onclick=()=>{const input=document.getElementById('newTask');if(!input.value.trim())return;ensureDay(todayKey()).push(['','',input.value.trim(),'自己的事',false]);input.value='';save();renderToday()};document.getElementById('newTask').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('addTask').click()});document.getElementById('clearDone').onclick=()=>{const list=ensureDay(todayKey());list.forEach(t=>t[4]=false);data.custom=data.custom.filter(t=>!t.done);syncHistory();renderToday()};
document.getElementById('addMistake').onclick=()=>document.getElementById('mistakeModal').classList.remove('hidden');document.querySelector('[data-close="mistakeModal"]').onclick=()=>document.getElementById('mistakeModal').classList.add('hidden');document.getElementById('saveMistake').onclick=()=>{const subject=document.getElementById('mistakeSubject').value.trim()||'待整理',text=document.getElementById('mistakeText').value.trim()||'还没写下错因';data.mistakes.unshift({subject,text,date:'刚刚'});save();awardReviewPoints();document.getElementById('mistakeModal').classList.add('hidden');document.getElementById('mistakeSubject').value='';document.getElementById('mistakeText').value='';renderMistakes()};
function loadSettings(){const g=id=>document.getElementById(id);const w=g('weekdayCare'),b=g('backupCare'),p=g('pickupNote');if(w)w.value=data.settings.weekdayCare||'待确认';if(b)b.value=data.settings.backupCare||'待确认';if(p)p.value=data.settings.pickupNote||'';const wk=g('wakeTime'),sl=g('sleepTime');if(wk)wk.value=data.settings.wakeTime||'07:00';if(sl)sl.value=data.settings.sleepTime||'21:00'}document.getElementById('saveGrowthNote').onclick=()=>{let record=data.history.find(x=>x.date===todayKey());if(!record){syncHistory();record=data.history.find(x=>x.date===todayKey())}record.note=document.getElementById('growthNote').value.trim();save();renderGrowth()};document.getElementById('saveHomework').onclick=()=>{save();const status=document.getElementById('homeworkStatus');if(status)status.textContent='本周作业已保存';};document.getElementById('openSettings').onclick=()=>enterFamily();
renderToday();loadSettings();ensureHomeworkSettings();renderHomework(false);document.querySelector('#homeworkView .homework-footer')?.remove();const familyNav=document.querySelector('.bottom-nav button[data-view="family"]');if(familyNav)familyNav.innerHTML='<span aria-hidden="true">♡</span>设置';const familyView=document.getElementById('familyView');if(familyView){familyView.querySelector('.section-kicker').textContent='SETTINGS / 设置';familyView.querySelector('h2').textContent='家长设置'}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDateIfChanged()});window.addEventListener('focus',refreshDateIfChanged);window.addEventListener('pageshow',refreshDateIfChanged);setInterval(refreshDateIfChanged,60000);

// 图片和录音放进 IndexedDB，避免占用 localStorage 的小容量配额。
const mediaDb=(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('chengcheng-media-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('media');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)}))();
async function putMedia(blob){const db=await mediaDb,id=`${Date.now()}-${Math.random().toString(16).slice(2)}`;await new Promise((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').put(blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return id}
async function getMedia(id){if(!id)return null;const db=await mediaDb;return new Promise((resolve,reject)=>{const req=db.transaction('media').objectStore('media').get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}
const blobToDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
let capturePhoto=null,captureAudio=null,recorder=null,recordingChunks=[];const captureModal=document.getElementById('captureModal');
document.getElementById('captureMistake').onclick=()=>captureModal.classList.remove('hidden');document.querySelector('[data-close="captureModal"]').onclick=()=>captureModal.classList.add('hidden');
document.getElementById('mistakePhoto').onchange=e=>{capturePhoto=e.target.files[0]||null;const preview=document.getElementById('photoPreview');if(capturePhoto){preview.src=URL.createObjectURL(capturePhoto);preview.classList.remove('hidden')}else preview.classList.add('hidden')};
document.getElementById('recordReflection').onclick=async()=>{const button=document.getElementById('recordReflection'),status=document.getElementById('recordStatus');if(recorder&&recorder.state==='recording'){recorder.stop();button.textContent='● 开始录音';button.classList.remove('recording');status.textContent='录音已完成';return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordingChunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)recordingChunks.push(e.data)};recorder.onstop=()=>{captureAudio=new Blob(recordingChunks,{type:recorder.mimeType||'audio/webm'});document.getElementById('reflectionAudio').src=URL.createObjectURL(captureAudio);document.getElementById('reflectionAudio').classList.remove('hidden');stream.getTracks().forEach(t=>t.stop())};recorder.start();button.textContent='■ 停止录音';button.classList.add('recording');status.textContent='正在听你说…'}catch(error){status.textContent='暂时不能录音，也可以写下来';console.warn(error)}};
document.getElementById('saveCapture').onclick=async()=>{const subject=document.getElementById('captureSubject').value.trim()||'待整理',text=document.getElementById('captureText').value.trim()||'还没写下反思';let photoId=null,audioId=null;try{if(capturePhoto)photoId=await putMedia(capturePhoto);if(captureAudio)audioId=await putMedia(captureAudio)}catch(error){alert('媒体暂时没有保存成功，请稍后重试');console.warn(error)}data.mistakes.unshift({id:`mistake-${Date.now()}`,subject,text,date:'刚刚',photoId,audioId,source:'澄澄的今天'});save();awardReviewPoints();capturePhoto=null;captureAudio=null;captureModal.classList.add('hidden');document.getElementById('mistakePhoto').value='';document.getElementById('captureSubject').value='';document.getElementById('captureText').value='';document.getElementById('photoPreview').classList.add('hidden');document.getElementById('reflectionAudio').classList.add('hidden');renderMistakes()};
document.getElementById('exportGrowth').onclick=async()=>{const records=[];for(const item of data.mistakes){const copy={...item};if(item.photoId){const blob=await getMedia(item.photoId);if(blob)copy.photo=await blobToDataUrl(blob)}if(item.audioId){const blob=await getMedia(item.audioId);if(blob)copy.audio=await blobToDataUrl(blob)}records.push(copy)}const payload={format:'ccgrowth',version:1,exportedAt:new Date().toISOString(),childLabel:'澄澄',mistakes:records,history:data.history,settings:{}};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`澄澄成长记录_${todayKey()}.ccgrowth`;a.click();URL.revokeObjectURL(url)};
document.getElementById('importGrowth').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const payload=JSON.parse(await file.text()),incoming=Array.isArray(payload.mistakes)?payload.mistakes:[];for(const item of incoming){if(data.mistakes.some(x=>x.id&&x.id===item.id))continue;const copy={...item};if(item.photo){copy.photoId=await putMedia(await (await fetch(item.photo)).blob());delete copy.photo}if(item.audio){copy.audioId=await putMedia(await (await fetch(item.audio)).blob());delete copy.audio}data.mistakes.push(copy)}if(Array.isArray(payload.history)){const known=new Set(data.history.map(x=>x.date));data.history.push(...payload.history.filter(x=>!known.has(x.date)))}save();alert(`已导入 ${incoming.length} 条成长记录`);renderMistakes();renderGrowth()}catch(error){alert('这个记录文件无法读取');console.warn(error)}e.target.value=''};
let familyDraft=JSON.parse(JSON.stringify(data.tasks||{})),familyScheduleDirty=false;
function setScheduleStatus(text,dirty=false){const el=document.getElementById('scheduleSaveStatus');if(el){el.textContent=text;el.classList.toggle('dirty',dirty)}}
function markFamilyScheduleDirty(){familyScheduleDirty=true;setScheduleStatus('有未保存修改',true)}
function saveFamilySchedule(){data.tasks=JSON.parse(JSON.stringify(familyDraft));data.settings.weekTemplateApplied=true;save();familyScheduleDirty=false;setScheduleStatus('已保存',false);renderToday();renderWeek();renderFamilyEditor()}
document.getElementById('saveSchedule').onclick=saveFamilySchedule;
document.getElementById('applyWeeklyTemplate').onclick=()=>{if(familyScheduleDirty&&!confirm('当前还有未保存修改，要用模板替换吗？'))return;const hasExisting=Object.values(data.tasks||{}).some(list=>Array.isArray(list)&&list.length);if(hasExisting&&!confirm('已有一周安排，要用家庭模板替换吗？'))return;familyDraft=JSON.parse(JSON.stringify(weeklyTemplate));data.tasks=JSON.parse(JSON.stringify(familyDraft));data.settings.weekTemplateApplied=true;familyScheduleDirty=false;save();setScheduleStatus('模板已套用',false);renderFamilyEditor();renderToday();renderWeek()};
document.getElementById('wakeTime').value=data.settings.wakeTime||'07:00';document.getElementById('sleepTime').value=data.settings.sleepTime||'21:00';
function updateRoutineDisplay(){document.getElementById('wakeDisplay').textContent=data.settings.wakeTime||'07:00';document.getElementById('sleepDisplay').textContent=data.settings.sleepTime||'21:00'}updateRoutineDisplay();
document.getElementById('saveFamily').addEventListener('click',()=>{data.settings.wakeTime=document.getElementById('wakeTime').value;data.settings.sleepTime=document.getElementById('sleepTime').value;save();updateRoutineDisplay();toast('固定作息已保存')});
document.getElementById('exportFamily').onclick=()=>{const payload={format:'ccfamily',version:1,exportedAt:new Date().toISOString(),tasks:data.tasks,settings:{...data.settings,wakeTime:document.getElementById('wakeTime').value,sleepTime:document.getElementById('sleepTime').value}};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`澄澄家庭安排_${todayKey()}.ccfamily`;a.click();URL.revokeObjectURL(url)};
document.getElementById('importFamily').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(!payload.tasks||!payload.settings)throw new Error('invalid config');data.tasks={...data.tasks,...payload.tasks};familyDraft=JSON.parse(JSON.stringify(data.tasks));familyScheduleDirty=false;data.settings={...data.settings,...payload.settings};save();loadSettings();document.getElementById('wakeTime').value=data.settings.wakeTime||'07:00';document.getElementById('sleepTime').value=data.settings.sleepTime||'21:00';setScheduleStatus('已导入',false);renderFamilyEditor();renderToday();renderWeek()}catch(error){alert('这个家庭安排文件无法读取');console.warn(error)}e.target.value=''};
let cameraStream=null;
async function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null}const video=document.getElementById('cameraPreview');if(video)video.srcObject=null;document.getElementById('cameraBox').classList.add('hidden')}
document.getElementById('startCamera').onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});const video=document.getElementById('cameraPreview');video.srcObject=cameraStream;document.getElementById('cameraBox').classList.remove('hidden');await video.play()}catch(error){const message=error?.name==='NotAllowedError'?'相机权限没有打开。请在 Safari 的网站设置中，把“相机”改为“允许”。':error?.name==='NotFoundError'?'没有找到可用的摄像头。':'当前页面地址暂不支持直接打开相机，请用 HTTPS 地址打开工作台。';alert(message);console.warn(error)}};
document.getElementById('takePhoto').onclick=()=>{const video=document.getElementById('cameraPreview'),canvas=document.createElement('canvas');canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||720;canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(!blob)return;capturePhoto=new File([blob],'mistake-photo.jpg',{type:'image/jpeg'});const preview=document.getElementById('photoPreview');preview.src=URL.createObjectURL(capturePhoto);preview.classList.remove('hidden');stopCamera()},'image/jpeg',.82)};
document.querySelector('[data-close="captureModal"]').addEventListener('click',stopCamera);
const guideQuestions=['这道题要你求什么？','你刚才是怎么想的？哪一步开始不确定？','题目里的哪个条件最重要？你有没有用上它？','如果重新做一次，你会先检查哪一步？'];let guideIndex=0,guideAnswers=[];
function renderGuide(){document.getElementById('guideStep').textContent=`第 ${guideIndex+1} / ${guideQuestions.length} 步`;document.getElementById('guideQuestion').textContent=guideQuestions[guideIndex];document.getElementById('guideAnswer').value=guideAnswers[guideIndex]||'';document.getElementById('guideBack').style.visibility=guideIndex?'visible':'hidden';document.getElementById('guideNext').textContent=guideIndex===guideQuestions.length-1?'完成引导':'下一步'}
document.getElementById('guideThinking').onclick=()=>{guideIndex=0;guideAnswers=[];document.getElementById('guidePanel').classList.remove('hidden');renderGuide();document.getElementById('guideAnswer').focus()};
document.getElementById('guideNext').onclick=()=>{guideAnswers[guideIndex]=document.getElementById('guideAnswer').value.trim();if(guideIndex<guideQuestions.length-1){guideIndex++;renderGuide()}else{document.getElementById('captureText').value=`我的反思：${guideAnswers.filter(Boolean).join('；')}`;updateLearningFeedback();document.getElementById('guideQuestion').textContent='已经把这道题想清楚一遍了。保存下来，下次再试一次。';document.getElementById('guideStep').textContent='引导完成';document.getElementById('guideAnswer').classList.add('hidden');document.getElementById('guideNext').classList.add('hidden')}};
document.getElementById('guideBack').onclick=()=>{if(guideIndex>0){guideIndex--;renderGuide()}};
document.getElementById('captureMistake').addEventListener('click',()=>{guideIndex=0;guideAnswers=[];document.getElementById('guidePanel').classList.add('hidden');document.getElementById('guideAnswer').classList.remove('hidden');document.getElementById('guideNext').classList.remove('hidden')});
const originalSaveCapture=document.getElementById('saveCapture').onclick;document.getElementById('saveCapture').onclick=async()=>{if(guideAnswers.length)document.getElementById('captureText').value=`我的反思：${guideAnswers.filter(Boolean).join('；')}`;await originalSaveCapture();guideAnswers=[];document.getElementById('guidePanel').classList.add('hidden');document.getElementById('guideAnswer').classList.remove('hidden');document.getElementById('guideNext').classList.remove('hidden')};
function makeLearningFeedback(text){const value=(text||'').trim();if(!value)return '';if(/题目|看清|读题|审题|条件|总数|每份|单位/.test(value))return '这次可以先把题目要找的量和已知条件圈出来，再开始计算；特别留意“总数、每份、单位”这些信息。';if(/计算|算错|加法|减法|乘法|除法|小数点|数字/.test(value))return '这次可以把重点放在运算过程：先估一估结果，再分步核对数字、运算符和小数点。';if(/公式|概念|定义|不会|不懂|意思/.test(value))return '这次可以先用自己的话说一遍这个概念，再对照公式或例题检查哪里还需要补充。';if(/方法|步骤|思路|不知道从哪/.test(value))return '这次可以先写出已知条件和题目要找的内容，再一步一步记录自己的做法。';return '可以先说清楚“题目要我求什么、我已经知道什么、下一步做什么”，再重新试一次。'}
function updateLearningFeedback(text=document.getElementById('captureText')?.value||''){const field=document.getElementById('learningFeedback');if(!field)return;const feedback=makeLearningFeedback(text);field.value=feedback;field.classList.toggle('has-feedback',Boolean(feedback))}
document.getElementById('captureText').addEventListener('input',e=>updateLearningFeedback(e.target.value));
const previousSaveCapture=document.getElementById('saveCapture').onclick;document.getElementById('saveCapture').onclick=async()=>{const feedback=document.getElementById('learningFeedback').value||makeLearningFeedback(document.getElementById('captureText').value);await previousSaveCapture();if(data.mistakes[0]){data.mistakes[0].learning=feedback;save()}document.getElementById('learningFeedback').value=''};
const escapeAttr=value=>String(value??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function renderFamilyEditor(){const editor=document.getElementById('familyScheduleEditor');editor.innerHTML=cnDays.map((name,dayIndex)=>{const tasks=familyDraft[dayIndex]||[];return `<div class="family-day-editor"><div class="family-day-head"><b>${name}</b><button class="add-schedule-btn" data-add-day="${dayIndex}">＋ 添加安排</button></div>${tasks.length?tasks.map((task,taskIndex)=>`<div class="schedule-edit-row"><input type="time" value="${escapeAttr(task[0])}" data-edit-day="${dayIndex}" data-edit-index="${taskIndex}" data-edit-field="0" aria-label="${name}开始时间"><input type="time" value="${escapeAttr(task[1])}" data-edit-day="${dayIndex}" data-edit-index="${taskIndex}" data-edit-field="1" aria-label="${name}结束时间"><input value="${escapeAttr(task[2])}" data-edit-day="${dayIndex}" data-edit-index="${taskIndex}" data-edit-field="2" placeholder="安排内容" aria-label="${name}安排内容"><input class="schedule-tag" value="${escapeAttr(task[3])}" data-edit-day="${dayIndex}" data-edit-index="${taskIndex}" data-edit-field="3" placeholder="类别" aria-label="${name}类别"><button class="delete-schedule-btn" data-delete-day="${dayIndex}" data-delete-index="${taskIndex}" aria-label="删除安排">×</button></div>`).join(''):'<div class="schedule-empty">还没有安排</div>'}</div>`}).join('');editor.querySelectorAll('[data-add-day]').forEach(button=>button.onclick=()=>{const dayIndex=Number(button.dataset.addDay);familyDraft[dayIndex]=familyDraft[dayIndex]||[];familyDraft[dayIndex].push(['','','新安排','活动',false]);markFamilyScheduleDirty();renderFamilyEditor()});editor.querySelectorAll('[data-edit-day]').forEach(input=>input.onchange=()=>{const task=familyDraft[Number(input.dataset.editDay)][Number(input.dataset.editIndex)];task[Number(input.dataset.editField)]=input.value;markFamilyScheduleDirty()});editor.querySelectorAll('[data-delete-day]').forEach(button=>button.onclick=()=>{familyDraft[Number(button.dataset.deleteDay)].splice(Number(button.dataset.deleteIndex),1);markFamilyScheduleDirty();renderFamilyEditor()})}
renderFamilyEditor();

/* ===== 本周内容发布与同步：电脑发布，iPad 只读拉取 ===== */
const GH_REPO='callychen1988/chengcheng-today', GH_BRANCH='main', CONTENT_PATH='content.json', GH_TOKEN_KEY='cc-gh-token';
const bytesToB64=bytes=>{let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s)};
function buildContentPayload(){
  const hw=homeworkForWeek(), homework={};
  homeworkTypes.forEach((type,i)=>{const item=hw[i]||{};homework[i]={text:item.text||'',fileName:item.fileName||''}});
  const tasks={};
  for(let i=0;i<7;i++)tasks[i]=(data.tasks[i]||[]).map(t=>[t[0]||'',t[1]||'',t[2]||'',t[3]||'活动',false]);
  return {
    format:'chengcheng-content', version:1, updatedAt:new Date().toISOString(),
    weekLabel:(()=>{const b=weekStart();return `${b.getMonth()+1}月${b.getDate()}日这周`})(),
    tasks, homework,
    settings:{weekdayCare:data.settings.weekdayCare,backupCare:data.settings.backupCare,pickupNote:data.settings.pickupNote}
  };
}
function applyRemoteContent(content){
  if(!content||content.format!=='chengcheng-content')return false;
  const ts=Date.parse(content.updatedAt||'')||0; if(!ts)return false;
  data.sync=data.sync||{tasksAt:0,homeworkAt:0,version:''};
  let changed=false;
  if(content.tasks&&ts>(data.sync.tasksAt||0)){
    const next={};
    for(let i=0;i<7;i++)next[i]=(content.tasks[i]||[]).map(t=>[t[0]||'',t[1]||'',t[2]||'',t[3]||'活动',false]);
    data.tasks=next; data.sync.tasksAt=ts; changed=true;
  }
  if(content.homework&&ts>(data.sync.homeworkAt||0)){
    const key=weekKeys()[0], week=data.homeworkWeeks[key]||(data.homeworkWeeks[key]={});
    Object.keys(content.homework).forEach(i=>{
      const incoming=content.homework[i]||{}, current=week[i]||{};
      if((incoming.text||'')!==(current.text||'')||(incoming.fileName||'')!==(current.fileName||''))
        week[i]={text:incoming.text||'',fileName:incoming.fileName||'',done:current.done||{}};
    });
    data.sync.homeworkAt=ts; changed=true;
  }
  if(content.settings&&content.tasks&&ts===(data.sync.tasksAt||0)){
    ['weekdayCare','backupCare','pickupNote'].forEach(k=>{if(content.settings[k]!=null)data.settings[k]=content.settings[k]});
  }
  data.sync.version=content.updatedAt||new Date(ts).toISOString();
  save();
  if(changed){
    familyDraft=JSON.parse(JSON.stringify(data.tasks));
    renderToday(); renderWeek(); renderHomework(false); renderFamilyEditor(); loadSettings();
  }
  return changed;
}
async function pullRemoteContent(silent=true){
  // 这台机器发布过，就是内容的来源端，自动拉取会把自己的改动冲掉，只允许手动拉取
  if(silent&&data.sync&&data.sync.source)return false;
  try{
    const res=await fetch(`${CONTENT_PATH}?t=${Date.now()}`,{cache:'no-store'});
    if(!res.ok)return false;
    const content=await res.json();
    const changed=applyRemoteContent(content);
    if(!silent)setPublishStatus(changed?'已拉取到最新内容':'内容已是最新');
    else if(changed)setPublishStatus('已同步最新内容');
    return changed;
  }catch(e){ if(!silent)setPublishStatus('拉取失败，请检查网络'); return false }
}
function setPublishStatus(text){const el=document.getElementById('publishStatus');if(el)el.textContent=text}
function downloadContentFile(){
  const blob=new Blob([JSON.stringify(buildContentPayload(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='content.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  setPublishStatus('已下载 content.json，把它放到项目根目录后同步即可');
}
async function publishToGitHub(){
  const token=(document.getElementById('publishToken')?.value||localStorage.getItem(GH_TOKEN_KEY)||'').trim();
  if(!token){document.getElementById('publishTokenBox').open=true;document.getElementById('publishToken').focus();setPublishStatus('请先填入 GitHub Token');return}
  localStorage.setItem(GH_TOKEN_KEY,token);
  setPublishStatus('正在发布…');
  const content=buildContentPayload(), api=`https://api.github.com/repos/${GH_REPO}/contents/${CONTENT_PATH}`;
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  try{
    let sha=null;
    const head=await fetch(api,{headers,cache:'no-store'});
    if(head.ok)sha=(await head.json()).sha;
    const body={message:`发布本周内容 · ${new Date().toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`,content:bytesToB64(new TextEncoder().encode(JSON.stringify(content,null,2))),branch:GH_BRANCH};
    if(sha)body.sha=sha;
    const res=await fetch(api,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){
      const ts=Date.parse(content.updatedAt);
      data.sync=data.sync||{};data.sync.tasksAt=ts;data.sync.homeworkAt=ts;data.sync.version=content.updatedAt;data.sync.source=true;save();
      setPublishStatus(`已发布 ${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}，约 1 分钟后 iPad 刷新可见`);
    }else if(res.status===401||res.status===403){
      setPublishStatus('Token 无效或没有该仓库的写权限');
    }else if(res.status===404){
      setPublishStatus('仓库不存在或 Token 未授权此仓库');
    }else{
      setPublishStatus(`发布失败（${res.status}）`);
    }
  }catch(e){ setPublishStatus('发布失败，请检查网络后重试') }
}
function ensurePublishPanel(){
  const family=document.getElementById('familyView');
  if(!family||document.getElementById('publishPanel'))return;
  const panel=document.createElement('div');
  panel.id='publishPanel';
  panel.className='publish-panel';
  panel.innerHTML=`<div class="publish-head"><div><h3>发布到 iPad</h3><p id="publishStatus">在这里改完安排和作业，点一下发布，iPad 打开就是最新的。</p></div></div>
    <div class="publish-actions"><button class="primary-btn" id="publishNow">发布到线上</button><button class="text-btn" id="pullNow">从线上拉取</button><button class="text-btn" id="downloadContent">下载内容文件</button></div>
    <details class="publish-token" id="publishTokenBox"><summary>首次使用需填一次 GitHub Token</summary><input id="publishToken" type="password" placeholder="github_pat_…" autocomplete="off" /><small>只保存在这台电脑的浏览器里；权限只需该仓库的 Contents: Read and write。不想用 Token 就点「下载内容文件」，把文件交给助手推送。</small></details>`;
  const homeworkBlock=family.querySelector('.homework-settings');
  const scheduleBlock=family.querySelector('.schedule-settings');
  if(homeworkBlock)homeworkBlock.after(panel);
  else if(scheduleBlock)scheduleBlock.after(panel);
  else family.appendChild(panel);
  document.getElementById('publishNow').onclick=publishToGitHub;
  document.getElementById('pullNow').onclick=()=>pullRemoteContent(false);
  document.getElementById('downloadContent').onclick=downloadContentFile;
  const saved=localStorage.getItem(GH_TOKEN_KEY);
  if(saved)document.getElementById('publishToken').value=saved;
}
function safeRun(label,fn){try{fn()}catch(e){console.warn('[init]',label,e)}}
safeRun('publishPanel',ensurePublishPanel);
safeRun('familyEditor',renderFamilyEditor);
safeRun('weekTools',bindWeekTools);
safeRun('dayEvent',bindDayEvent);
safeRun('homework',()=>{ensureHomeworkSettings();renderHomework(false)});
setTimeout(()=>pullRemoteContent(true),600);
// 兜底：页面从缓存恢复（back/forward、iOS 复用页面）时再渲染一次
window.addEventListener('pageshow',e=>{if(e.persisted)safeRun('rerender',()=>{renderToday();renderFamilyEditor()})});

/* ===== 家长密码：进入家长设置需验证，避免孩子自行改动 ===== */
const PARENT_PIN_KEY='cc_parent_pin',PARENT_PIN_DEFAULT='1234';
let parentUnlocked=false,parentPinThen=null;
function parentPin(){try{return localStorage.getItem(PARENT_PIN_KEY)||PARENT_PIN_DEFAULT}catch(e){return PARENT_PIN_DEFAULT}}
function saveParentPin(v){try{localStorage.setItem(PARENT_PIN_KEY,String(v))}catch(e){}}
function enterFamily(){if(parentUnlocked){showView('family');return}openParentGate(()=>showView('family'))}
function openParentGate(then,label){parentPinThen=typeof then==='function'?then:null;const m=document.getElementById('parentGate'),inp=document.getElementById('parentPinInput'),hint=document.getElementById('parentPinHint'),lab=document.getElementById('parentGateLabel');if(lab)lab.textContent=label||'输入密码后进入设置';if(!m||!inp)return;inp.value='';if(hint)hint.textContent='';m.classList.remove('hidden');setTimeout(()=>inp.focus(),60)}
function closeParentGate(){const m=document.getElementById('parentGate');if(m)m.classList.add('hidden');parentPinThen=null}
function submitParentPin(){const inp=document.getElementById('parentPinInput'),hint=document.getElementById('parentPinHint');const v=((inp&&inp.value)||'').trim();if(!v){if(hint)hint.textContent='请输入密码';return}if(v!==parentPin()){if(hint)hint.textContent='密码不对，再试一次';if(inp){inp.value='';inp.focus()}return}const then=parentPinThen;parentUnlocked=true;closeParentGate();if(then)then()}
function bindParentGate(){
  const close=document.querySelector('[data-close="parentGate"]');if(close)close.onclick=closeParentGate;
  // 忘记密码时的自救：在弹窗标题上连点 5 次（3 秒内）把家长密码重置回 1234
  const kick=document.querySelector('.parent-gate-card .section-kicker');
  if(kick){let taps=0,timer=null;kick.onclick=()=>{taps++;clearTimeout(timer);timer=setTimeout(()=>{taps=0},3000);if(taps>=5){taps=0;clearTimeout(timer);if(!confirm('把家长密码重置为 1234 吗？'))return;saveParentPin('1234');const h=document.getElementById('parentPinHint'),i=document.getElementById('parentPinInput');if(h)h.textContent='已重置为 1234，重新输入即可';if(i){i.value='';i.focus()}toast('家长密码已重置为 1234')}}}
  const ok=document.getElementById('parentPinOk');if(ok)ok.onclick=submitParentPin;
  const inp=document.getElementById('parentPinInput');if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitParentPin()}});
  const setBtn=document.getElementById('saveParentPin');
  if(setBtn)setBtn.onclick=()=>{const a=document.getElementById('newParentPin'),b=document.getElementById('newParentPin2'),st=document.getElementById('parentPinStatus');const v1=((a&&a.value)||'').trim(),v2=((b&&b.value)||'').trim();if(!/^\d{4,8}$/.test(v1)){if(st)st.textContent='请输入 4–8 位数字';return}if(v1!==v2){if(st)st.textContent='两次输入不一致';return}saveParentPin(v1);if(a)a.value='';if(b)b.value='';if(st)st.textContent='';toast('家长密码已更新')};
}
safeRun('parentGate',bindParentGate);

/* ===== 积分与兑换（demo） =====
 * 规则：只加分不扣分；每笔按「日期 + 位置 + 标题」去重；当天可撤，跨天锁定；
 * 日上限 12 分硬封顶；兑换需家长密码；不做随机奖励。
 */
const POINTS_DAY_CAP = 12, POINTS_BONUS = 3, POINTS_OWN_CAP = 2;
const DEFAULT_PRIZES = [
  { id: 'play30', icon: '⏳', name: '周末多玩 30 分钟', cost: 30, note: '周末任选一天，说一声就行' },
  { id: 'dinner', icon: '🍜', name: '晚餐我说了算', cost: 60, note: '点一次外卖，或选今晚吃什么' },
  { id: 'book', icon: '📖', name: '一本书 / 一本漫画', cost: 120, note: '去书店自己挑一本' },
  { id: 'zoo', icon: '🐼', name: '动物园一整天', cost: 260, note: '周末出门，一整天都算' }
];
const POINT_RULES = [
  ['爸爸奥数', 3],
  ['学校作业 / 语文 / 英语', 2],
  ['课外班：鼓 / 舞蹈 / 昂立', 2],
  ['生活自理：书包、桌面', 1],
  ['自己加的小事', 1, '每天最多 2 分'],
  ['英语听力 / 绘本 / 单词', 1, '每项每天一次'],
  ['一天全部做完', 3, '额外奖励']
];

function pointsStore() {
  if (!data.points || typeof data.points !== 'object') data.points = {};
  if (!Array.isArray(data.points.ledger)) data.points.ledger = [];
  if (!Array.isArray(data.points.spent)) data.points.spent = [];
  return data.points;
}
function pointsOn(key) { return pointsStore().ledger.filter(x => x.date === key).reduce((n, x) => n + (Number(x.pts) || 0), 0); }
const pointsEarned = () => pointsStore().ledger.reduce((n, x) => n + (Number(x.pts) || 0), 0);
const pointsSpent = () => pointsStore().spent.reduce((n, x) => n + (Number(x.cost) || 0), 0);
const pointsBalance = () => Math.max(0, pointsEarned() - pointsSpent());
const pointsWeek = () => { const keys = weekKeys(); return pointsStore().ledger.filter(x => keys.includes(x.date)).reduce((n, x) => n + (Number(x.pts) || 0), 0); };

const taskPointId=(key,task)=>`t|${key}|${task[0]||''}|${task[2]||''}`;
function pointsForTask(task) {
  const title = task[2] || '', tag = task[3] || '';
  if (/奥数|数学/.test(title)) return 3;
  if (/学校|作业|语文|英语|昂立|绘本|单词/.test(title)) return 2;
  if (/舞蹈|架子鼓|活动|才艺|泉灵/.test(title)) return 2;
  if (/整理|书包|桌面|准备|习惯/.test(title) || tag === '习惯' || tag === '家庭') return 1;
  return 1;
}

// 记一笔分：id 去重 + 日上限 + 自加小事单独限额，返回实际加到的分
function awardPoints(id, label, pts, kind) {
  if (!id || !pts) return 0;
  const P = pointsStore(), date = todayKey();
  if (P.ledger.some(x => x.id === id)) return 0;
  let give = Math.min(pts, Math.max(0, POINTS_DAY_CAP - pointsOn(date)));
  if (kind === 'own') {
    const own = P.ledger.filter(x => x.date === date && x.kind === 'own').reduce((n, x) => n + (Number(x.pts) || 0), 0);
    give = Math.min(give, Math.max(0, POINTS_OWN_CAP - own));
  }
  if (give <= 0) return 0;
  P.ledger.push({ id, date, label, pts: give, full: pts, kind: kind || 'task', at: Date.now() });
  return give;
}
// 撤一笔分：当天可撤，跨天锁定（返回 -1 表示锁住）
function revokePoints(id) {
  const P = pointsStore(), i = P.ledger.findIndex(x => x.id === id);
  if (i < 0) return 0;
  if (P.ledger[i].date !== todayKey()) return -1;
  return P.ledger.splice(i, 1)[0].pts || 0;
}
const hasPointId = id => pointsStore().ledger.some(x => x.id === id);

function syncTaskPoints(key, task) {
  const id = taskPointId(key, task), msgs = [];
  if (task[4]) {
    const kind = task[3] === '自己的事' ? 'own' : 'task';
    const got = awardPoints(id, task[2] || '一件小事', pointsForTask(task), kind);
    if (got > 0) msgs.push(`+${got} 分 · ${task[2] || '一件小事'}`);
    else if (!hasPointId(id)) msgs.push(kind === 'own' ? '自己加的小事今天已经加满分了' : `今天的分攒满了（${POINTS_DAY_CAP} 分）`);
    renderPointsBadge(); bumpPill();
  } else {
    const back = revokePoints(id);
    if (back === -1) msgs.push('这一笔记在昨天了，分不改');
    else if (back > 0) msgs.push(`退回 ${back} 分`);
    renderPointsBadge();
  }
  const bonus = syncDayBonus(key);
  if (bonus > 0) msgs.push(`全部做完，再 +${bonus} 分`);
  if (msgs.length) { toast(msgs.join(' · ')); bumpPill(); }
  renderPointsLive();
  return msgs.join(' · ');
}
function syncDayBonus(key) {
  const list = Array.isArray(data.days[key]) ? data.days[key] : tasksFor(key);
  const allDone = list.length > 0 && list.every(t => t[4]);
  const id = `bonus|${key}`;
  if (allDone) return awardPoints(id, '今天全部做完', POINTS_BONUS, 'bonus');
  revokePoints(id);
  return 0;
}
// 课外作业按「整块全部勾完 +2」计分：条目多少不影响分值，避免按数量刷分
function syncHomeworkPoints(typeIndex) {
  const stats = homeworkStats(homeworkForWeek(), typeIndex);
  const id = `hw|${weekKeys()[0]}|${typeIndex}`;
  const label = (homeworkTypes[typeIndex] || ['课外作业'])[0];
  const msgs = [];
  if (stats.tasks > 0 && stats.done >= stats.tasks) {
    const got = awardPoints(id, label, 2, 'task');
    if (got > 0) { msgs.push(`+${got} 分 · ${label}这一块做完了`); bumpPill(); }
  } else {
    const back = revokePoints(id);
    if (back > 0) msgs.push(`${label}还没全做完，退回 ${back} 分`);
    else if (back === -1) msgs.push('这一笔记在昨天了，分不改');
  }
  renderPointsBadge();
  renderPointsLive();
  if (msgs.length) toast(msgs.join(' · '));
}

function renderPointsBadge() {
  const n = pointsBalance();
  const pill = document.getElementById('pillBalance'), bal = document.getElementById('ptsBalance');
  if (pill) pill.textContent = n;
  if (bal) bal.textContent = n;
}
function bumpPill() {
  const el = document.getElementById('pointsPill');
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}
function dayShortLabel(key) {
  if (key === todayKey()) return '今天';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (key === keyOf(y)) return '昨天';
  const d = parseKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
let ledgerShown = 16;
function prizeList() { return Array.isArray(data.prizes) ? data.prizes : DEFAULT_PRIZES; }
function ensurePrizeArray() {
  if (!Array.isArray(data.prizes)) data.prizes = DEFAULT_PRIZES.map(p => ({ ...p }));
  return data.prizes;
}
function prizeCount(prizeId) { return pointsStore().spent.filter(x => x.prizeId === prizeId).length; }

function renderPoints() {
  const P = pointsStore(), bal = pointsBalance();
  const today = pointsOn(todayKey()), week = pointsWeek(), days = new Set(P.ledger.map(x => x.date)).size;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('ptsBalance', bal); set('ptsToday', today); set('ptsWeek', week); set('ptsDays', days);
  set('pillBalance', bal);

  const prizes = prizeList();
  const next = prizes.find(p => Math.max(1, Number(p.cost) || 0) > bal);
  const hint = document.getElementById('ptsHint');
  if (hint) hint.textContent = !prizes.length
    ? '家长还没有设置礼品，先勾一件小事攒分吧'
    : next
      ? `再攒 ${Math.max(1, Number(next.cost) || 0) - bal} 分，就能换「${next.name || '新礼品'}」`
      : '想换的都换得起啦，慢慢挑一件';
  const goal = document.getElementById('ptsGoal');
  if (goal) {
    goal.classList.toggle('hidden', !next);
    const bar = goal.querySelector('i');
    if (bar && next) bar.style.width = Math.max(4, Math.min(100, Math.round(bal / Math.max(1, Number(next.cost) || 0) * 100))) + '%';
  }

  const grid = document.getElementById('prizeGrid');
  if (grid) {
    if (!prizes.length) grid.innerHTML = '<div class="empty-state">家长还没有设置礼品。想要的可以先跟爸爸妈妈说一声。</div>';
    else grid.innerHTML = prizes.map(p => {
      const cost = Math.max(1, Number(p.cost) || 0), ready = bal >= cost;
      const pct = Math.min(100, Math.round(bal / cost * 100));
      const times = prizeCount(p.id);
      return `<button class="prize-card ${ready ? 'ready' : ''}" data-prize="${escapeAttr(p.id)}">
        ${times ? `<span class="prize-count">换过 ${times} 次</span>` : ''}
        <span class="prize-icon" aria-hidden="true">${hwEsc(p.icon || '🎁')}</span>
        <h4>${hwEsc(p.name || '新礼品')}</h4>
        <span class="prize-note">${hwEsc(p.note || '')}</span>
        <span class="prize-bar"><i style="width:${pct}%"></i></span>
        <span class="prize-cost">${ready ? '现在可以换 · ' : ''}${cost} 分</span>
      </button>`;
    }).join('');
    grid.querySelectorAll('[data-prize]').forEach(b => b.onclick = () => redeemPrize(b.dataset.prize));
  }

  const rules = document.getElementById('ruleGrid');
  if (rules) rules.innerHTML = POINT_RULES.map(r => `<span class="rule-chip">${r[0]}<b>+${r[1]}</b>${r[2] ? `<em>${r[2]}</em>` : ''}</span>`).join('');

}

/* ===== 记录：统一放在「我做过的事」里，积分页不再重复一遍 ===== */
function ledgerRows() {
  const P = pointsStore();
  return [
    ...P.ledger.map(x => ({ date: x.date, at: x.at || 0, label: x.label, val: x.pts, minus: false })),
    ...P.spent.map(x => ({ date: x.date, at: x.at || 0, label: '换：' + x.name, val: x.cost, minus: true }))
  ].sort((a, b) => b.at - a.at);
}
function noteOfDay(key) {
  const h = (data.history || []).find(x => x.date === key);
  return h && h.note ? h.note : '';
}
function renderGrowthLedger() {
  const box = document.getElementById('growthLedger');
  if (!box) return;
  const allRows = ledgerRows();
  if (!allRows.length) {
    box.innerHTML = '<div class="empty-state">还没有记录。勾掉今天第一件小事，这里就会亮起来。</div>';
    return;
  }
  const rows = allRows.slice(0, ledgerShown);
  let last = '', html = '';
  rows.forEach(r => {
    if (r.date !== last) {
      // 分组头只算「那天攒到多少」，兑换单独成行显示，不冲掉当天的成绩
      const daySum = allRows.filter(x => x.date === r.date && !x.minus).reduce((n, x) => n + (Number(x.val) || 0), 0);
      const tail = daySum ? `+${daySum}` : '';
      html += `<div class="pts-day"><span>${dayShortLabel(r.date)}</span>${tail ? `<b>${tail}</b>` : ''}</div>`;
      const note = noteOfDay(r.date);
      if (note) html += `<div class="pts-note">“${hwEsc(note)}”</div>`;
      last = r.date;
    }
    const time = r.at ? new Date(r.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
    html += `<div class="pts-row ${r.minus ? 'minus' : ''}"><span class="pts-when">${time}</span><span class="pts-name">${hwEsc(r.label)}</span><span class="pts-val">${r.minus ? '−' : '+'}${r.val}</span></div>`;
  });
  if (allRows.length > rows.length) html += `<button class="pts-more" id="ptsMore" type="button">看更早的记录（还有 ${allRows.length - rows.length} 条）</button>`;
  box.innerHTML = html;
  const more = document.getElementById('ptsMore');
  if (more) more.onclick = () => { ledgerShown += 40; renderGrowthLedger(); };
}
// 只更新数字，不重建奖品卡（避免勾选时手中的按钮被判为已移除）
function renderPointsLive() {
  const bal = pointsBalance();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('ptsBalance', bal); set('ptsToday', pointsOn(todayKey())); set('ptsWeek', pointsWeek());
  const view = document.getElementById('pointsView');
  if (view && !view.classList.contains('hidden')) renderPoints();
  const growth = document.getElementById('growthView');
  if (growth && !growth.classList.contains('hidden')) renderGrowth();
}

function redeemPrize(id) {
  const p = prizeList().find(x => x.id === id);
  if (!p) return;
  const bal = pointsBalance();
  if (bal < p.cost) { toast(`还差 ${p.cost - bal} 分，再攒攒`); return; }
  openParentGate(() => {
    pointsStore().spent.push({ id: `spend|${id}|${Date.now()}`, prizeId: id, name: p.name, cost: p.cost, date: todayKey(), at: Date.now() });
    save(); renderPoints(); bumpPill();
    toast(`换好了：${p.name}（−${p.cost} 分）`);
  }, `输入密码后兑换「${p.name}」`);
}
// 已经勾掉的今天任务也算进来，打开就有数
function backfillTodayPoints() {
  const key = todayKey(), list = tasksFor(key);
  list.forEach((t, i) => {
    if (!t[4]) return;
    awardPoints(taskPointId(key, t), t[2] || '一件小事', pointsForTask(t), t[3] === '自己的事' ? 'own' : 'task');
  });
  if (list.length && list.every(t => t[4])) awardPoints(`bonus|${key}`, '今天全部做完', POINTS_BONUS, 'bonus');
  save();
}
// 错题反思：一天只记一次，避免靠数量刷分
function awardReviewPoints() {
  const got = awardPoints(`review|${todayKey()}`, '写下错题反思', 2, 'review');
  if (got > 0) { toast(`+${got} 分 · 记下这道错题`); bumpPill(); }
  renderPointsBadge();
  renderPointsLive();
}

function renderPrizeSettings() {
  const host = document.getElementById('prizeSettingsHost');
  if (!host) return;
  const list = prizeList();
  host.innerHTML = `<div class="schedule-settings prize-settings">
    <div class="schedule-settings-head"><div><h3>积分与礼品</h3><p>孩子只能看到这里配好的礼品，不能改。改完立刻生效。</p></div><button class="mini-btn" id="addPrize" type="button">＋ 加一个</button></div>
    <div class="prize-edit-list" id="prizeEditList">${list.map((p, i) => `<div class="prize-edit-row">
      <input data-pn="${i}" value="${escapeAttr(p.name || '')}" maxlength="16" placeholder="礼品名称" aria-label="礼品名称" />
      <input data-pc="${i}" type="number" inputmode="numeric" min="1" max="999" value="${Math.max(1, Number(p.cost) || 0)}" aria-label="需要多少分" />
      <input data-pd="${i}" value="${escapeAttr(p.note || '')}" maxlength="24" placeholder="一句说明（可留空）" aria-label="礼品说明" />
      <button class="prize-del" data-pdel="${i}" type="button" aria-label="删除这个礼品">×</button>
    </div>`).join('')}</div>
    <p class="prize-settings-note">分值改多少都不会影响已经攒下的分和兑换记录；删掉礼品，换过的记录也还在。</p>
  </div>`;
  const box = document.getElementById('prizeEditList');
  const arr = () => ensurePrizeArray();
  if (box) {
    box.querySelectorAll('[data-pn]').forEach(el => el.oninput = () => {
      const t = arr()[Number(el.dataset.pn)];
      if (t) { t.name = el.value; save(); renderPoints(); }
    });
    box.querySelectorAll('[data-pc]').forEach(el => el.oninput = () => {
      const t = arr()[Number(el.dataset.pc)];
      if (t) { t.cost = Math.max(1, Math.min(999, Math.round(Number(el.value) || 1))); save(); renderPoints(); }
    });
    box.querySelectorAll('[data-pd]').forEach(el => el.oninput = () => {
      const t = arr()[Number(el.dataset.pd)];
      if (t) { t.note = el.value; save(); renderPoints(); }
    });
    box.querySelectorAll('[data-pdel]').forEach(el => el.onclick = () => {
      const i = Number(el.dataset.pdel), t = arr()[i];
      if (!t) return;
      if (!confirm(`删掉「${t.name || '这个礼品'}」吗？已经兑换过的记录会保留。`)) return;
      arr().splice(i, 1);
      save(); renderPrizeSettings(); renderPoints();
      toast('已删除');
    });
  }
  const add = document.getElementById('addPrize');
  if (add) add.onclick = () => {
    const a = arr();
    a.push({ id: `p${Date.now()}`, icon: '🎁', name: '新礼品', cost: 30, note: '' });
    save(); renderPrizeSettings(); renderPoints();
    const rows = document.querySelectorAll('#prizeEditList .prize-edit-row');
    const last = rows[rows.length - 1];
    if (last) { const input = last.querySelector('[data-pn]'); if (input) { input.focus(); input.select(); } }
  };
}

// 英语小天地：次数照旧累加，积分按「每项每天一次」给，点多少下都不重复加
function awardEnglishPoints(i, withToast) {
  const key = todayKey(), goal = ENGLISH_GOALS[i] || [], name = goal[1] || '英语';
  const got = awardPoints(`en|${key}|${i}`, name, 1, 'task');
  const times = englishWeekCount(i);
  if (withToast) {
    const tail = got > 0 ? `+${got} 分` : (hasPointId(`en|${key}|${i}`) ? '这项今天的分已经记过了' : `今天的分攒满了（${POINTS_DAY_CAP} 分）`);
    toast(`已记下：${name}，本周第 ${times} 次 · ${tail}`);
  }
  renderPointsBadge();
  if (got > 0) bumpPill();
  save(); // 页面上的 save() 在加分之前，这里必须再存一次，否则分只在内存里
  renderPointsLive();
  return got;
}
function backfillEnglishPoints() {
  const key = todayKey(), rec = data.english && data.english[key];
  if (!Array.isArray(rec)) return;
  ENGLISH_GOALS.forEach((g, i) => { if (Number(rec[i]) > 0) awardPoints(`en|${key}|${i}`, g[1], 1, 'task'); });
  save();
}

function initPoints() {
  pointsStore();
  backfillTodayPoints();
  backfillEnglishPoints();
  renderPointsBadge();
  renderPoints();
  renderPrizeSettings();
  const pill = document.getElementById('pointsPill');
  if (pill) pill.onclick = () => showView('points');
  const reset = document.getElementById('pointsReset');
  if (reset) reset.onclick = () => openParentGate(() => {
    if (!confirm('清空全部积分和记录吗？攒分进度会归零，这个操作不能撤销。')) return;
    data.points = { ledger: [], spent: [] };
    save(); renderPoints(); renderPointsBadge();
    toast('积分已清空');
  }, '输入密码后清空积分');
}
safeRun('points', initPoints);
