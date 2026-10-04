import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {calculateFee,parseAmount,tariff} from '../frontend/calculator.mjs';
const app=readFileSync(new URL('../frontend/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function setup(locale){
 const html=readFileSync(new URL(`../dist/${locale}/index.html`,import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:`https://qa.example/${locale}/?utm_source=qa&utm_campaign=clean`,runScripts:'outside-only'});
 const w=dom.window;
 Object.assign(w,{calculateFee,parseAmount,tariff,matchMedia:()=>({matches:true,addEventListener(){}}),animate(){throw Error('Animation must not run with reduced motion');},createTimeline(){throw Error('Timeline must not run with reduced motion');},stagger(){throw Error('Stagger must not run with reduced motion');}});
 let calls=0;const blocked=()=>{calls++;throw Error('Network/remote action forbidden in functional test');};
 w.fetch=blocked;w.XMLHttpRequest=blocked;w.open=blocked;w.navigator.sendBeacon=blocked;
 w.eval(app);
 const d=w.document;const dispatch=(el,type)=>el.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));
 return {dom,w,d,dispatch,networkCalls:()=>calls};
}
for(const locale of ['ru','kk']){
 test(`${locale}: four wizard steps, validation, back restores answer, restart clears answers`,()=>{
  const {dom,w,d,dispatch}=setup(locale);
  try{
   const content=JSON.parse(d.querySelector('#page-content').textContent);
   assert.equal(content.diagnostic.questions.length,4);
   const legend=()=>d.querySelector('#wizard-content legend');
   assert.equal(legend().textContent,content.diagnostic.questions[0].title);
   assert.equal(d.querySelector('#wizard-form [type=submit]').disabled,true);
   dispatch(d.querySelector('#wizard-form'),'submit');
   assert.equal(legend().textContent,content.diagnostic.questions[0].title);
   function choose(index=0){const input=d.querySelectorAll('#wizard-form input')[index];input.checked=true;dispatch(input,'change');dispatch(d.querySelector('#wizard-form'),'submit');}
   choose();
   assert.equal(legend().textContent,content.diagnostic.questions[1].title);
   d.querySelector('#wizard-back').click();
   assert.equal(legend().textContent,content.diagnostic.questions[0].title);
   assert.equal(d.querySelector('#wizard-form input').checked,true);
   dispatch(d.querySelector('#wizard-form'),'submit');
   choose();choose();choose();
   assert.equal(d.querySelector('.wizard-result-title').textContent,content.diagnostic.resultTitle);
   assert.ok(d.querySelectorAll('.wizard-result li').length>=2);
   const target=new URL(d.querySelector('#wizard-content a').href);
   assert.equal(target.hostname,'wa.me');
   assert.equal(target.searchParams.get('text'),content.contact.whatsappGreeting);
   assert.equal(w.quqyqAnalytics.events.filter(e=>e.name==='diagnostic_complete').length,1);
   d.querySelector('#wizard-restart').click();
   assert.equal(legend().textContent,content.diagnostic.questions[0].title);
   assert.equal(d.querySelector('#wizard-form input:checked'),null);
   assert.equal(d.querySelector('#wizard-form [type=submit]').disabled,true);
  }finally{dom.window.close();}
 });
 test(`${locale}: calculator invalid, recovery, boundary ambiguity, partial execution refusal`,()=>{
  const {dom,w,d,dispatch}=setup(locale);
  try{
   const input=d.querySelector('#claim-amount');const form=d.querySelector('#calculator-form');const result=d.querySelector('#calculator-result');
   input.value='-42';dispatch(form,'submit');
   assert.equal(input.getAttribute('aria-invalid'),'true');assert.ok(d.querySelector('#calc-error').textContent);
   assert.equal(w.quqyqAnalytics.events.filter(e=>e.name==='calculator_complete').length,0);
   input.value='500 000';dispatch(input,'input');dispatch(form,'submit');
   assert.equal(input.hasAttribute('aria-invalid'),false);assert.match(result.textContent,/20%/);assert.match(result.textContent,/100\s*000/);
   input.value=String(60*tariff.mrp);dispatch(form,'submit');
   assert.ok(result.querySelector('.boundary'));assert.match(result.textContent,/25%/);assert.match(result.textContent,/20%/);
   d.querySelector('#execution-kind').value='other';dispatch(form,'submit');
   assert.equal(result.querySelector('.fee-amount'),null);
   assert.match(result.textContent,locale==='ru'?/Нужна проверка документов/:/Құжаттарды тексеру қажет/);
   assert.equal(w.quqyqAnalytics.events.filter(e=>e.name==='calculator_complete').length,2);
  }finally{dom.window.close();}
 });
 test(`${locale}: lead requires valid fields and consent; prepares locally without sensitive URL or analytics`,()=>{
  const {dom,w,d,dispatch,networkCalls}=setup(locale);
  try{
   const lead=d.querySelector('#lead-form');const box=d.querySelector('#prepared-message');const anchors=()=>[...d.querySelectorAll('a[href]')].map(a=>a.href);
   const before=anchors();
   dispatch(lead,'submit');assert.equal(box.hidden,true);
   d.querySelector('#lead-name').value='TEST_SECRET_NAME';d.querySelector('#lead-phone').value='+7 777 123 45 67';d.querySelector('#lead-city').value='TEST_SECRET_CITY';d.querySelector('#lead-message').value='<script>TEST_SECRET_MESSAGE</script>';
   dispatch(lead,'submit');assert.equal(box.hidden,true);
   lead.querySelector('[name=consent]').checked=true;
   assert.equal(lead.checkValidity(),true);dispatch(lead,'submit');
   assert.equal(box.hidden,false);
   const preview=d.querySelector('#message-preview');assert.match(preview.value,/TEST_SECRET_NAME/);assert.match(preview.value,/TEST_SECRET_MESSAGE/);
   assert.equal(d.querySelector('script:not([src]):not(#page-content)')?.textContent.includes('TEST_SECRET_MESSAGE')??false,false);
   assert.deepEqual(anchors(),before);
   const analytics=JSON.stringify(w.quqyqAnalytics);
   for(const secret of ['TEST_SECRET_NAME','TEST_SECRET_CITY','TEST_SECRET_MESSAGE','777 123'])assert.equal(analytics.includes(secret),false);
   assert.equal(w.localStorage.length,0);assert.equal(w.sessionStorage.length,0);assert.equal(networkCalls(),0);
   assert.equal(w.quqyqAnalytics.events.filter(e=>e.name==='lead_prepare').length,1);
  }finally{dom.window.close();}
 });
 test(`${locale}: menu opens, Escape closes/restores focus, link click closes`,()=>{
  const {dom,w,d}=setup(locale);
  try{
   const button=d.querySelector('.menu-button');const menu=d.querySelector('#mobile-menu');
   button.click();assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(menu.hidden,false);
   d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(menu.hidden,true);assert.equal(d.activeElement,button);
   button.click();const a=menu.querySelector('a');a.addEventListener('click',e=>e.preventDefault());a.click();
   assert.equal(menu.hidden,true);assert.equal(button.getAttribute('aria-expanded'),'false');
  }finally{dom.window.close();}
 });
}
