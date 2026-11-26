function createCanvasKit(ctx){
const W=960,H=540;
const INK='#4a3728',PAPER='#FAF5EA';
const BUN='#F3B75E',BUN_D='#D98F3C',PATTY='#8A5632',PATTY_D='#5F3A1E',
      CHEESE='#F7C948',CHEESE_D='#D9962B',LETTUCE='#8CC084',LETTUCE_D='#5E9B55',
      TOMATO='#E85D4D',TOMATO_D='#C23E30',TOMATO_L='#F4937F',
      SAUCE='#A8542F',SAUCE_L='#C97B4E',GREEN='#6FA85F',GRAY='#8a7a63';
const STROKE=Object.freeze({ fine: 2, ink: 3, emphasis: 4 });
const TYPE=Object.freeze({ note: 18, caption: 22, label: 34, title: 44 });
ctx.lineJoin='round';ctx.lineCap='round';

/* ================= 유틸 ================= */
const clamp01=v=>Math.max(0,Math.min(1,v));
const seg=(t,a,b)=>clamp01((t-a)/(b-a));
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeO=t=>1-Math.pow(1-t,3);
const easeOB=t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};

function jline(x1,y1,x2,y2,seed=1,amp=2.2){
  const n=9;ctx.beginPath();
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,px=-dy/len,py=dx/len;
  for(let i=0;i<=n;i++){const t=i/n;
    const off=(rnd(seed*13+i*7)-.5)*2*amp*Math.sin(t*Math.PI);
    const X=x1+dx*t+px*off,Y=y1+dy*t+py*off;
    i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
  ctx.stroke();
}
function jellipse(x,y,rx,ry,seed=5,a0=0,a1=Math.PI*2){
  const n=28;ctx.beginPath();
  for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;
    const rj=1+(rnd(seed*17+i*3)-.5)*0.06;
    const X=x+Math.cos(a)*rx*rj,Y=y+Math.sin(a)*ry*rj;
    i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
  ctx.closePath();
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

const paperDots=[];for(let i=0;i<90;i++)paperDots.push([rnd(i)*W,rnd(i+999)*H,rnd(i+50)*2+0.5]);
function bg(){
  ctx.fillStyle=PAPER;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(74,55,40,0.05)';
  for(const d of paperDots){ctx.beginPath();ctx.arc(d[0],d[1],d[2],0,7);ctx.fill();}
  // 은은한 비네팅
  const g=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(74,55,40,0.08)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function label(txt,x,y,size=TYPE.label,color=INK,weight=800){
  ctx.fillStyle=color;
  ctx.font=weight+' '+size+'px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,x,y);
}

/* ============ v2 헬퍼: 그림자·광택·얼굴·뱃지 ============ */
function softShadow(x,y,w){
  ctx.fillStyle='rgba(74,55,40,0.13)';
  ctx.beginPath();ctx.ellipse(x,y,Math.max(10,w/2),Math.max(6,w*0.045),0,0,7);ctx.fill();
}
function sheen(x,y,rx,ry){
  ctx.save();ctx.fillStyle='rgba(255,255,255,0.4)';
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,-0.5,0,7);ctx.fill();ctx.restore();
}
function face(x,y,s){
  s=s||1;
  ctx.fillStyle=INK;
  ctx.beginPath();ctx.ellipse(x-13*s,y,5*s,7*s,0,0,7);ctx.fill();
  ctx.beginPath();ctx.ellipse(x+13*s,y,5*s,7*s,0,0,7);ctx.fill();
  ctx.fillStyle='rgba(233,120,105,0.5)';
  ctx.beginPath();ctx.ellipse(x-26*s,y+9*s,6.5*s,4.2*s,0,0,7);ctx.fill();
  ctx.beginPath();ctx.ellipse(x+26*s,y+9*s,6.5*s,4.2*s,0,0,7);ctx.fill();
  ctx.strokeStyle=INK;ctx.lineWidth=STROKE.ink*s;ctx.beginPath();
  ctx.arc(x,y+5*s,10*s,Math.PI*0.2,Math.PI*0.8);ctx.stroke();
}
function pill(txt,x,y,bgc,fgc,size){
  bgc=bgc||GREEN;fgc=fgc||'#fff';size=size||TYPE.caption;
  ctx.font='700 '+size+'px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
  const tw=ctx.measureText(txt).width,pad=size*0.75;
  ctx.fillStyle=bgc;ctx.strokeStyle=INK;ctx.lineWidth=STROKE.ink;
  rr(x-tw/2-pad/2,y-size*0.78,tw+pad,size*1.56,size*0.78);ctx.fill();ctx.stroke();
  ctx.fillStyle=fgc;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(txt,x,y+1);
}
function numBadge(n,x,y,a){
  ctx.save();ctx.globalAlpha=a===undefined?1:a;
  ctx.fillStyle=INK;ctx.beginPath();ctx.arc(x,y,17,0,7);ctx.fill();
  ctx.fillStyle=PAPER;ctx.font='800 22px sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),x,y+1);
  ctx.restore();
}
return {W,H,INK,PAPER,BUN,BUN_D,PATTY,PATTY_D,CHEESE,CHEESE_D,LETTUCE,LETTUCE_D,TOMATO,TOMATO_D,TOMATO_L,SAUCE,SAUCE_L,GREEN,GRAY,STROKE,TYPE,clamp01,seg,lerp,rnd,easeIO,easeO,easeOB,jline,jellipse,rr,bg,label,softShadow,sheen,face,pill,numBadge};
}

export { createCanvasKit };
