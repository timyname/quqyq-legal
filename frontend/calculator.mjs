export const tariff = Object.freeze({year:2026, mrp:4325, reviewed:'2026-10-05', source:'https://adilet.zan.kz/rus/docs/V2300032907', limits:[60,300,1000,5000,10000,20000], rates:[25,20,15,10,8,5,3], capMrp:10000});
export function parseAmount(raw) {
  const value=String(raw).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount=Number(value);
  return Number.isFinite(amount)&&amount>0&&amount<=1e12 ? amount : null;
}
export function calculateFee(amount) {
  if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>1e12) throw new RangeError('Invalid amount');
  const cents=Math.round(amount*100);
  const thresholds=tariff.limits.map(x=>x*tariff.mrp*100);
  const boundary=thresholds.slice(0,-1).indexOf(cents);
  const index=thresholds.findIndex(x=>cents<=x);
  const rate=tariff.rates[index===-1?6:index];
  const feeAt=(r)=>Math.min(cents*r/100/100,tariff.capMrp*tariff.mrp);
  if(boundary!==-1) {
    const rates=[tariff.rates[boundary],tariff.rates[boundary+1]];
    return {boundary:true, rates, fees:rates.map(feeAt),mrp:tariff.mrp,year:tariff.year};
  }
  return {boundary:false,rate,fee:feeAt(rate),capped:cents*rate/100/100>tariff.capMrp*tariff.mrp,mrp:tariff.mrp,year:tariff.year};
}
