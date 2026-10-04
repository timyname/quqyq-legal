import {calculateFee,parseAmount,tariff} from './calculator.mjs';
import {animate,createTimeline,stagger,onScroll} from './vendor/anime.esm.min.js';
const content=JSON.parse(document.querySelector('#page-content').textContent);
const lang=document.body.dataset.locale;
const ru=lang==='ru';
const t=(a,b)=>ru?a:b;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const events=[];
// Only non-identifying event names and interface state. No answers, sums, phone, names or messages.
function track(name,detail={}){const event={name,locale:lang,route:document.body.dataset.route,at:Date.now(),...detail};events.push(event);if(events.length>100)events.shift();window.dispatchEvent(new CustomEvent('quqyq:event',{detail:event}));}
track('page_view');
const utm={};for(const key of ['utm_source','utm_medium','utm_campaign']){const v=new URLSearchParams(location.search).get(key);if(v&&/^[a-zA-Z0-9_-]{1,60}$/.test(v))utm[key]=v;}
// Campaign values remain in volatile memory; no network provider connected.
window.quqyqAnalytics={events,campaign:utm};
for(const el of document.querySelectorAll('[data-event]'))el.addEventListener('click',()=>track(el.dataset.event));
const menu=document.querySelector('.menu-button');const mobileMenu=document.querySelector('#mobile-menu');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));mobileMenu.hidden=open;});
mobileMenu?.addEventListener('click',e=>{if(e.target.closest('a')){mobileMenu.hidden=true;menu.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobileMenu.hidden){mobileMenu.hidden=true;menu.setAttribute('aria-expanded','false');menu.focus();}});
for(const el of document.querySelectorAll('[data-faq]'))el.addEventListener('toggle',()=>{if(el.open)track('faq_open',{item:Number(el.dataset.faq)});});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motions=[];const motionObservers=[];
function stopMotion(){for(const observer of motionObservers.splice(0))observer.disconnect();for(const motion of motions.splice(0))motion.revert?.();document.querySelectorAll('[data-process-step]').forEach(el=>el.classList.remove('is-current'));}
function startMotion(){
 if(reduced.matches)return;
 try{
  const timeline=createTimeline({defaults:{ease:'outExpo',duration:620}});
  if(document.querySelector('.hero-copy'))timeline.add('.hero-copy',{translateY:[10,0],opacity:[.9,1]});
  if(document.querySelector('.hero-art'))timeline.add('.hero-art',{translateY:[14,0],scale:[1.015,1],duration:800},90);
  motions.push(timeline);
  if('IntersectionObserver' in window){
   const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){if(!entry.isIntersecting)continue;const el=entry.target;observer.unobserve(el);if(reduced.matches)continue;
     if(el.hasAttribute('data-process-step')){el.classList.add('is-current');motions.push(animate(el.querySelector('.process-marker'),{scale:[.9,1],duration:350,ease:'outExpo'}));continue;}
     const type=el.dataset.reveal;
     if(type==='chapter'){motions.push(animate(el.querySelector('.chapter-art img'),{scale:[1.045,1],duration:520,ease:'outExpo'}));motions.push(animate(el.querySelector('.spotlight-copy'),{translateY:[10,0],opacity:[.85,1],duration:480,ease:'outExpo'}));}
     else if(type==='diagnostic'){motions.push(animate(el.querySelector('.flow-line'),{opacity:[.6,1],duration:400,ease:'outQuad'}));}
     else{motions.push(animate(el,{translateY:[8,0],opacity:[.88,1],duration:450,ease:'outExpo'}));}
    }
   },{threshold:.12,rootMargin:'0px 0px -35px 0px'});
   document.querySelectorAll('[data-reveal],[data-process-step]').forEach(el=>observer.observe(el));motionObservers.push(observer);
  }
  const rail=document.querySelector('.process-rail-fill');
  if(rail&&typeof onScroll==='function'){motions.push(animate(rail,{scaleY:[0,1],ease:'linear',autoplay:onScroll({target:'.process-steps',enter:'bottom-=100 top',leave:'center bottom',sync:true})}));}
 }catch(error){stopMotion();console.warn('QŪQYQ: motion unavailable; static content retained.');}
}
startMotion();
reduced.addEventListener?.('change',()=>{stopMotion();if(!reduced.matches)startMotion();updateReadingProgress();});
const readingBar=document.querySelector('.reading-progress span');let scheduled=false;
function updateReadingProgress(){scheduled=false;const height=document.documentElement.scrollHeight-window.innerHeight;const progress=height>0?Math.max(0,Math.min(1,window.scrollY/height)):0;if(readingBar)readingBar.style.transform=`scaleX(${progress})`;document.querySelector('.header')?.classList.toggle('is-scrolled',window.scrollY>10);}
const requestProgress=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateReadingProgress);}};
window.addEventListener('scroll',requestProgress,{passive:true});window.addEventListener('resize',requestProgress,{passive:true});document.addEventListener('toggle',requestProgress,true);updateReadingProgress();
const stickyCta=document.querySelector('[data-mobile-cta]');const busySections=new Set();
function updateStickyCta(){if(!stickyCta)return;const typing=!!document.activeElement?.matches('input,textarea,select');stickyCta.hidden=typing||busySections.size>0;}
if(stickyCta&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting)busySections.add(e.target);else busySections.delete(e.target);}updateStickyCta();},{rootMargin:'-95px 0px -85px 0px',threshold:0});document.querySelectorAll('#diagnostic,#calculator,#contact').forEach(el=>observer.observe(el));}
document.addEventListener('focusin',updateStickyCta);document.addEventListener('focusout',()=>queueMicrotask(updateStickyCta));
const wizard=document.querySelector('#wizard-content');
if(wizard){
 let step=0;const answers={};let started=false;let feedbackMotion;
 const d=content.diagnostic;
 function checks(){const problem=answers.problem;const authority=answers.authority;const status=answers.status;const docs=answers.documents;
  const list=[t('Постановление: кто, когда и на каком основании установил меру.','Қаулы: шараны кім, қашан және қандай негізбен қолданды.'),t('Дата получения документов и актуальный порядок обращения.','Құжаттарды алу күні және қолданыстағы жүгіну тәртібі.')];
  if(problem==='fee')list.push(t('Сумма требования, тариф, исполненная часть и отдельные расходы.','Талап сомасы, тариф, орындалған бөлігі және бөлек шығыстар.'));
  if(problem==='accounts'||problem==='withholding')list.push(t('Назначение поступлений и документы об источнике денег.','Түсімдердің мақсаты және ақшаның шығу тегін растайтын құжаттар.'));
  if(problem==='travel')list.push(t('Основание ограничения выезда, извещение и действующие производства.','Шығуды шектеу негізі, хабарлау және қолданыстағы іс жүргізулер.'));
  if(problem==='property')list.push(t('Право собственности, вид ограничения и постановление по имуществу.','Меншік құқығы, шектеу түрі және мүлікке қатысты қаулы.'));
  if(problem==='creditor')list.push(t('Статус исполнительного документа и перечень выполненных действий.','Атқарушылық құжаттың мәртебесі және орындалған әрекеттер тізімі.'));
  if(problem==='paid'||status==='paid'||status==='ended')list.push(t('Платежи, основание окончания и другие производства; окончание не всегда отменяет все меры.','Төлемдер, аяқтау негізі және өзге істер; аяқталу барлық шараны әрдайым жоймайды.'));
  if(authority&&authority!=='chsi')list.push(t('Установить надлежащий порядок: мера банка, суда или иного органа может требовать другого обращения.','Тиісті тәртіпті анықтау: банктің, соттың немесе өзге органның шарасы басқа өтінішті қажет етуі мүмкін.'));
  if(docs==='none'||docs==='bank')list.push(t('Запросить документ-основание; одного сообщения банка для вывода недостаточно.','Негіз болған құжатты сұрату; банк хабарламасы қорытынды жасауға жеткіліксіз.'));
  return list;
 }
 function render(focus=false){
  if(step===d.questions.length){wizard.innerHTML=`<h3 class="wizard-result-title" tabindex="-1">${escape(d.resultTitle)}</h3><ul class="wizard-result">${checks().map(x=>`<li>${escape(x)}</li>`).join('')}</ul><p class="small">${escape(d.resultDescription)}</p><div class="actions"><button class="button secondary" type="button" id="wizard-restart">${escape(d.restart)}</button><a class="button primary" data-event="whatsapp_click" href="https://wa.me/77081019624?text=${encodeURIComponent(content.contact.whatsappGreeting)}" target="_blank" rel="noopener noreferrer">${escape(d.resultCta)}</a></div>`;wizard.querySelector('#wizard-restart').onclick=()=>{step=0;for(const k of Object.keys(answers))delete answers[k];render(true);};wizard.querySelector('a').onclick=()=>track('whatsapp_click');if(focus)wizard.querySelector('h3').focus();return;}
  const q=d.questions[step];const optionMarkup=o=>`<label class="wizard-option"><input type="radio" name="answer" value="${escape(o.value)}" ${answers[q.id]===o.value?'checked':''} required><span>${escape(o.label)}</span></label>`;const hasMore=q.options.length>6;const visibleOptions=hasMore?q.options.slice(0,4):q.options;const extraOptions=hasMore?q.options.slice(4):[];wizard.innerHTML=`<div class="wizard-progress" aria-hidden="true">${d.questions.map((_,i)=>`<span class="${i<=step?'current':''}"></span>`).join('')}</div><p class="wizard-step">${escape(d.step)} ${step+1} ${escape(d.of)} ${d.questions.length}</p><form id="wizard-form"><fieldset><legend tabindex="-1">${escape(q.title)}</legend><div class="wizard-options">${visibleOptions.map(optionMarkup).join('')}</div>${hasMore?`<details class="wizard-more" ${extraOptions.some(o=>o.value===answers[q.id])?'open':''}><summary>${t('Другая ситуация','Басқа жағдай')}</summary><div class="wizard-options">${extraOptions.map(optionMarkup).join('')}</div></details>`:''}</fieldset><div class="actions">${step?`<button class="button secondary" type="button" id="wizard-back">${escape(d.back)}</button>`:''}<button class="button primary" type="submit" ${answers[q.id]?'':'disabled'}>${escape(step===d.questions.length-1?d.finish:d.next)}</button></div></form>`;
  const form=wizard.querySelector('form');form.addEventListener('change',e=>{answers[q.id]=e.target.value;form.querySelector('[type="submit"]').disabled=false;if(!started){started=true;track('diagnostic_start');}});
  form.onsubmit=e=>{e.preventDefault();if(!answers[q.id])return;track('diagnostic_step',{step:step+1});step++;if(step===d.questions.length)track('diagnostic_complete');render(true);if(!reduced.matches){try{if(feedbackMotion){feedbackMotion.revert?.();const index=motions.indexOf(feedbackMotion);if(index>=0)motions.splice(index,1);}feedbackMotion=animate(wizard,{opacity:[.7,1],translateY:[4,0],duration:180,ease:'outQuad'});motions.push(feedbackMotion);}catch{stopMotion();}}};
  wizard.querySelector('#wizard-back')?.addEventListener('click',()=>{step--;render(true);});if(focus)wizard.querySelector('legend').focus();
 }
 render();
}
const calculator=document.querySelector('#calculator-form');
if(calculator){
 const input=calculator.querySelector('#claim-amount'),kind=calculator.querySelector('#execution-kind');
 const result=document.querySelector('#calculator-result'),error=document.querySelector('#calc-error');
 const format=n=>new Intl.NumberFormat(ru?'ru-KZ':'kk-KZ',{maximumFractionDigits:2}).format(n)+' ₸';
 let began=false;input.addEventListener('input',()=>{if(!began){track('calculator_start');began=true;}input.removeAttribute('aria-invalid');error.textContent='';});
 calculator.onsubmit=e=>{e.preventDefault();error.textContent='';const amount=parseAmount(input.value);
  if(amount===null){error.textContent=content.calculator.invalid;input.setAttribute('aria-invalid','true');input.focus();return;}
  if(kind.value!=='full'){result.innerHTML=`<h3>${t('Нужна проверка документов','Құжаттарды тексеру қажет')}</h3><p>${t('Тарифный ориентир здесь рассчитан только для полного исполнения денежного требования в 2026 году. Для вашего варианта нужно проверить исполненную часть, категорию и применимую редакцию.','Бұл бағдар тек 2026 жылы ақшалай талап толық орындалғанда қолданылады. Сіздің нұсқаңызда орындалған бөлікті, санатты және қолданылатын редакцияны тексеру қажет.')}</p>`;return;}
  const fee=calculateFee(amount);
  if(fee.boundary){result.innerHTML=`<h3 class="boundary">${t('Сумма на границе тарифов','Сома тарифтер шекарасында')}</h3><p>${t('Формулировки диапазонов пересекаются. По одному вводу нельзя установить единственную ставку. Проверьте постановление ЧСИ.','Диапазондардың тұжырымдары қиылысады. Бір енгізілім арқылы жалғыз мөлшерді белгілеу мүмкін емес. ЖСО қаулысын тексеріңіз.')}</p><p>${fee.rates.map((r,i)=>`${r}%: ${format(fee.fees[i])}`).join(' / ')}</p>`;}
  else result.innerHTML=`<p class="small">${escape(content.calculator.result)}</p><p class="fee-amount">${format(fee.fee)}</p><p>${escape(content.calculator.rate)}: <strong>${fee.rate}%</strong></p><p class="small quiet">${t('МРП','АЕК')} ${tariff.year} = ${format(tariff.mrp)}. ${fee.capped?t('Учтён предел 10 000 МРП.','10 000 АЕК шегі ескерілді.'):''} ${escape(content.calculator.disclaimer)}</p>`;
  track('calculator_complete',{boundary:fee.boundary});if(!reduced.matches)motions.push(animate(result,{opacity:[.6,1],duration:220,ease:'outQuad'}));
 };
}
const lead=document.querySelector('#lead-form');
if(lead){
 lead.onsubmit=e=>{e.preventDefault();if(!lead.reportValidity())return;const data=new FormData(lead);const topic=content.services.items.find(s=>s.id===data.get('topic'))?.title||'';const message=[content.contact.whatsappGreeting,`${content.contact.nameLabel}: ${data.get('name')}`,`${content.contact.phoneLabel}: ${data.get('phone')}`,`${t('Город','Қала')}: ${data.get('city')}`,`${t('Тема','Тақырып')}: ${topic}`,String(data.get('message')||'')].filter(Boolean).join('\n');document.querySelector('#message-preview').value=message;document.querySelector('#prepared-message').hidden=false;document.querySelector('#message-preview').focus();track('lead_prepare');};
 document.querySelector('#copy-message').onclick=async()=>{const preview=document.querySelector('#message-preview');try{await navigator.clipboard.writeText(preview.value);document.querySelector('#copy-status').textContent=content.contact.copied;track('lead_copy');}catch{preview.select();document.querySelector('#copy-status').textContent=t('Копирование недоступно. Выделите текст и скопируйте вручную.','Көшіру қолжетімсіз. Мәтінді белгілеп, қолмен көшіріңіз.');}};
}
