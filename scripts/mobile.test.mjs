import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {calculateFee,parseAmount,tariff} from '../frontend/calculator.mjs';
const source=readFileSync(new URL('../frontend/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function setup(locale,{reduced=false,failMotion=false}={}){
 const html=readFileSync(new URL(`../dist/${locale}/index.html`,import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:`https://qa.example/${locale}/`,runScripts:'outside-only'});const w=dom.window;const d=w.document;
 const motion=[];const observers=[];const scrollLinks=[];const frames=[];let change;
 const preference={matches:reduced,addEventListener(type,callback){change=callback;}};
 function animation(target,options={}){if(failMotion)throw new Error('Unavailable motion');const result={target,options,reverted:false,revert(){this.reverted=true;},add(){return this;}};motion.push(result);return result;}
 class Observer{constructor(callback,options){this.callback=callback;this.options=options;this.targets=[];this.disconnected=false;observers.push(this);}observe(el){this.targets.push(el);}unobserve(el){this.targets=this.targets.filter(x=>x!==el);}disconnect(){this.disconnected=true;}emit(el,isIntersecting){this.callback([{target:el,isIntersecting}]);}}
 Object.assign(w,{calculateFee,parseAmount,tariff,matchMedia:()=>preference,animate:animation,createTimeline:()=>animation('timeline'),stagger:()=>0,onScroll:options=>{scrollLinks.push(options);return options;},IntersectionObserver:Observer,requestAnimationFrame:callback=>{frames.push(callback);return frames.length;}});
 w.console.warn=()=>{};Object.defineProperty(w,'innerHeight',{value:800,configurable:true});Object.defineProperty(d.documentElement,'scrollHeight',{value:2000,configurable:true});
 w.eval(source);return {dom,w,d,motion,observers,scrollLinks,flush(){for(const cb of frames.splice(0))cb();},toggle(value){preference.matches=value;change();}};
}
for(const locale of ['ru','kk']){
 test(`${locale}: additional wizard options are disclosed and selected choice survives back`,()=>{
  const {dom,w,d}=setup(locale,{reduced:true});try{
   const more=d.querySelector('.wizard-more');assert.ok(more);assert.equal(more.open,false);assert.equal(d.querySelectorAll('#wizard-form > fieldset > .wizard-options input').length,4);
   more.open=true;const option=more.querySelector('input');option.checked=true;option.dispatchEvent(new w.Event('change',{bubbles:true}));d.querySelector('#wizard-form').dispatchEvent(new w.Event('submit',{cancelable:true}));d.querySelector('#wizard-back').click();
   assert.equal(d.querySelector('.wizard-more').open,true);assert.equal(d.querySelector('.wizard-more input').checked,true);
  }finally{dom.window.close();}
 });
 test(`${locale}: sticky action yields to typing and to visible diagnostic/calculator/contact`,async()=>{
  const {dom,d,observers}=setup(locale,{reduced:true});try{
   const cta=d.querySelector('[data-mobile-cta]');assert.equal(cta.hidden,false);d.querySelector('#lead-name').focus();assert.equal(cta.hidden,true);d.querySelector('#lead-name').blur();await Promise.resolve();assert.equal(cta.hidden,false);
   const observer=observers.find(o=>o.targets.includes(d.querySelector('#contact')));assert.ok(observer);
   observer.emit(d.querySelector('#diagnostic'),true);assert.equal(cta.hidden,true);observer.emit(d.querySelector('#contact'),true);observer.emit(d.querySelector('#diagnostic'),false);assert.equal(cta.hidden,true);observer.emit(d.querySelector('#contact'),false);assert.equal(cta.hidden,false);observer.emit(d.querySelector('#calculator'),true);assert.equal(cta.hidden,true);d.querySelector('#calculator-form button').focus();assert.equal(cta.hidden,true);observer.emit(d.querySelector('#calculator'),false);assert.equal(cta.hidden,false);
  }finally{dom.window.close();}
 });
 test(`${locale}: scroll signals reveal once, reading progress is real, reduced-motion cleans up`,()=>{
  const {dom,w,d,observers,motion,scrollLinks,flush,toggle}=setup(locale);try{
   assert.ok(scrollLinks.some(link=>link.target==='.process-steps'&&link.sync===true));
   const observer=observers.find(o=>o.targets.includes(d.querySelector('[data-process-step]')));const step=d.querySelector('[data-process-step]');assert.ok(observer);observer.emit(step,true);assert.equal(step.classList.contains('is-current'),true);assert.equal(observer.targets.includes(step),false);
   const chapter=d.querySelector('[data-reveal=chapter]');observer.emit(chapter,true);assert.equal(observer.targets.includes(chapter),false);assert.ok(motion.some(m=>m.target===chapter.querySelector('img')));
   Object.defineProperty(w,'scrollY',{value:600,configurable:true});w.dispatchEvent(new w.Event('scroll'));flush();assert.equal(d.querySelector('.reading-progress span').style.transform,'scaleX(0.5)');assert.equal(d.querySelector('.header').classList.contains('is-scrolled'),true);
   const before=[...motion];toggle(true);assert.ok(before.every(m=>m.reverted));assert.equal(observer.disconnected,true);assert.equal(step.classList.contains('is-current'),false);assert.ok(d.querySelector('#wizard-form'));assert.ok(d.querySelector('#services'));assert.equal(d.querySelector('#services').hidden,false);
  }finally{dom.window.close();}
 });
 test(`${locale}: animation failure preserves working diagnostic and visible content`,()=>{
  const {dom,w,d}=setup(locale,{failMotion:true});try{
   assert.ok(d.querySelector('#wizard-form'));assert.equal(d.querySelector('[data-reveal=chapter]').hidden,false);
   const option=d.querySelector('#wizard-form input');option.checked=true;option.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(d.querySelector('#wizard-form [type=submit]').disabled,false);
  }finally{dom.window.close();}
 });
}
