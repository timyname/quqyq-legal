import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFee,parseAmount,tariff} from '../frontend/calculator.mjs';
test('official examples across every bracket',()=>{
  for(const [amount,rate,fee] of [[100000,25,25000],[500000,20,100000],[2000000,15,300000],[10000000,10,1000000],[30000000,8,2400000],[50000000,5,2500000],[100000000,3,3000000]]) {
    const result=calculateFee(amount); assert.equal(result.rate,rate);assert.equal(result.fee,fee);
  }
});
test('all boundaries and cents on both sides; last bracket strictly above',()=>{
  tariff.limits.forEach((mrp,i)=>{
    const amount=mrp*tariff.mrp;
    assert.equal(calculateFee(amount-.01).rate,tariff.rates[i]);
    assert.equal(calculateFee(amount+.01).rate,tariff.rates[i+1]);
    const at=calculateFee(amount);
    if(i<5) {assert.equal(at.boundary,true);assert.deepEqual(at.rates,tariff.rates.slice(i,i+2));}
    else {assert.equal(at.boundary,false);assert.equal(at.rate,5);}
  });
});
test('cap and cents preserved',()=>{
  assert.equal(calculateFee(2e9).fee,43250000); assert.equal(calculateFee(2e9).capped,true);
  assert.ok(Math.abs(calculateFee(100000.01).fee-25000.0025)<.000001);
});
test('localized parsing and hostile/invalid input',()=>{
  assert.equal(parseAmount('1 234 567,89'),1234567.89);assert.equal(parseAmount('500\u202f000'),500000);
  for(const value of ['',0,-1,'NaN','Infinity','1e6','1,2,3','2.999','123abc','<script>',1000000000001]) assert.equal(parseAmount(value),null);
  for(const value of [NaN,Infinity,-1,0,'500',1000000000001]) assert.throws(()=>calculateFee(value));
});
