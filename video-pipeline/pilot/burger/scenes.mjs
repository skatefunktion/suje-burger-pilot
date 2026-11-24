function createBurgerScenes(ctx,kit){
const {W,H,INK,PAPER,BUN,BUN_D,PATTY,PATTY_D,CHEESE,CHEESE_D,LETTUCE,LETTUCE_D,TOMATO,TOMATO_D,TOMATO_L,SAUCE,SAUCE_L,GREEN,GRAY,clamp01,seg,lerp,rnd,easeIO,easeO,easeOB,jline,jellipse,rr,bg,label,softShadow,sheen,face,pill,numBadge}=kit;
/* ============ 미니 재료 아이콘 (출처 장면용) ============ */
function iconFlour(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle='#F7F0DE';
  ctx.beginPath();
  ctx.moveTo(x-26*s,y-28*s);
  ctx.quadraticCurveTo(x-32*s,y+8*s,x-24*s,y+28*s);
  ctx.lineTo(x+24*s,y+28*s);
  ctx.quadraticCurveTo(x+32*s,y+8*s,x+26*s,y-28*s);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=BUN_D;rr(x-27*s,y-38*s,54*s,11*s,5*s);ctx.fill();ctx.stroke();
  ctx.fillStyle='#E8A94F';
  ctx.beginPath();ctx.ellipse(x,y+4*s,9*s,14*s,0,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle=BUN_D;ctx.lineWidth=2;
  for(let k=-2;k<=2;k++)jline(x,y+4*s+k*6*s,x-13*s,y+k*6*s,700+k,1);
  ctx.lineWidth=3;ctx.strokeStyle=INK;
}
function iconBeef(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle='#C65A4A';
  ctx.beginPath();ctx.ellipse(x,y,30*s,22*s,0.15,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#F2C9B8';ctx.lineWidth=5;ctx.beginPath();
  ctx.ellipse(x,y,30*s,22*s,0.15,Math.PI*0.85,Math.PI*1.45);ctx.stroke();
  ctx.strokeStyle='#E8907F';ctx.lineWidth=3;
  jline(x-14*s,y-4*s,x+10*s,y+2*s,801,2);
  jline(x-8*s,y+8*s,x+14*s,y-8*s,802,2);
  ctx.lineWidth=3;ctx.strokeStyle=INK;
}
function iconVeg(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle=LETTUCE;ctx.beginPath();
  const n=10;
  for(let k=0;k<=n;k++){
    const px=x-30*s+k*(46*s/n),py=y+8*s+Math.sin(k*2.2)*7*s;
    k?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.quadraticCurveTo(x-6*s,y+30*s,x-30*s,y+8*s);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=TOMATO;
  ctx.beginPath();ctx.arc(x+18*s,y-10*s,14*s,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=LETTUCE;
  for(let k=0;k<3;k++){
    const a=-Math.PI/2+(k-1)*0.7;
    ctx.beginPath();
    ctx.ellipse(x+18*s+Math.cos(a)*7*s,y-10*s-13*s+Math.sin(a)*5*s,5*s,3*s,a,0,7);
    ctx.fill();
  }
}
function iconCheese(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle=CHEESE;
  ctx.beginPath();
  ctx.moveTo(x-28*s,y+20*s);ctx.lineTo(x+28*s,y+20*s);ctx.lineTo(x+28*s,y-18*s);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=CHEESE_D;
  ctx.beginPath();ctx.arc(x+8*s,y+6*s,6*s,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(x-8*s,y+10*s,4*s,0,7);ctx.fill();
}
function iconSesame(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle='#8A6F4D';
  ctx.beginPath();ctx.arc(x,y+8*s,26*s,0.15*Math.PI,0.85*Math.PI);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-26*s,y+8*s);ctx.lineTo(x+26*s,y+8*s);ctx.stroke();
  ctx.fillStyle='#FFF6DF';
  for(let k=0;k<7;k++){
    const px=x-18*s+rnd(900+k)*36*s,py=y-2*s-rnd(910+k)*13*s;
    ctx.save();ctx.translate(px,py);ctx.rotate(rnd(920+k)*3);
    ctx.beginPath();ctx.ellipse(0,0,6*s,4*s,0,0,7);ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle=INK;ctx.stroke();ctx.restore();
  }
  ctx.lineWidth=3;ctx.strokeStyle=INK;
}
function iconSauce(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle=SAUCE;rr(x-20*s,y-12*s,40*s,34*s,8*s);ctx.fill();ctx.stroke();
  ctx.fillStyle=BUN_D;rr(x-23*s,y-26*s,46*s,13*s,6*s);ctx.fill();ctx.stroke();
  ctx.fillStyle='#FFFDF6';rr(x-14*s,y-4*s,28*s,18*s,4*s);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.font='700 '+Math.round(11*s)+'px "Apple SD Gothic Neo",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('양념',x,y+5*s);
}
function iconTomato(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle=TOMATO;ctx.beginPath();ctx.arc(x,y,16*s,0,7);ctx.fill();ctx.stroke();
  sheen(x-5*s,y-6*s,6*s,4*s);
  ctx.fillStyle=LETTUCE;
  for(let k=0;k<3;k++){
    const a=-Math.PI/2+(k-1)*0.7;
    ctx.beginPath();ctx.ellipse(x+Math.cos(a)*7*s,y-16*s+Math.sin(a)*5*s,5*s,3*s,a,0,7);ctx.fill();
  }
}
function iconLettuce(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle=LETTUCE;ctx.beginPath();
  const n=8;
  for(let k=0;k<=n;k++){
    const px=x-20*s+k*(40*s/n),py=y-6*s+Math.sin(k*2.4)*6*s;
    k?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.quadraticCurveTo(x,y+18*s,x-20*s,y-6*s);
  ctx.closePath();ctx.fill();ctx.stroke();
}

/* ============ 여정 스트립 (농장→트럭→버거집) ============ */
function farm(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  ctx.fillStyle='#A8C686';rr(x-70*s,y-6*s,140*s,46*s,10*s);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#7A9B5C';ctx.lineWidth=2.5;
  for(let k=0;k<4;k++)jline(x-60*s,y+6*s+k*9*s,x+60*s,y+6*s+k*9*s,500+k,1.5);
  ctx.fillStyle='#B0714F';ctx.strokeStyle=INK;ctx.lineWidth=3;
  rr(x-34*s,y-58*s,68*s,52*s,4*s);ctx.fill();ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x-42*s,y-58*s);ctx.lineTo(x,y-86*s);ctx.lineTo(x+42*s,y-58*s);
  ctx.closePath();ctx.fillStyle='#8A5632';ctx.fill();ctx.stroke();
  ctx.strokeStyle='#FFFDF6';ctx.lineWidth=3;
  jline(x-9*s,y-42*s,x+9*s,y-42*s,501,1);
  jline(x,y-50*s,x,y-34*s,502,1);
  ctx.fillStyle='#F7C948';ctx.strokeStyle=INK;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(x+88*s,y-66*s,16*s,0,7);ctx.fill();ctx.stroke();
  ctx.lineWidth=2.5;
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4;
    jline(x+88*s+Math.cos(a)*22*s,y-66*s+Math.sin(a)*22*s,
          x+88*s+Math.cos(a)*30*s,y-66*s+Math.sin(a)*30*s,510+k,1);
  }
  ctx.lineWidth=3;ctx.strokeStyle=INK;
}
function truck(x,y,s,bob){
  s=s||1;ctx.save();ctx.translate(x,y+(bob||0));
  ctx.lineWidth=3.5;ctx.strokeStyle=INK;
  softShadow(0,30*s,120*s);
  ctx.fillStyle='#FDFBF4';rr(-58*s,-34*s,88*s,52*s,8*s);ctx.fill();ctx.stroke();
  ctx.fillStyle='#E8A94F';rr(30*s,-22*s,34*s,40*s,6*s);ctx.fill();ctx.stroke();
  ctx.fillStyle='#BFD9E8';rr(36*s,-16*s,22*s,16*s,4*s);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;
  ctx.beginPath();ctx.arc(-32*s,20*s,13*s,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(40*s,20*s,13*s,0,7);ctx.fill();
  ctx.fillStyle='#FFFDF6';
  ctx.beginPath();ctx.arc(-32*s,20*s,5*s,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(40*s,20*s,5*s,0,7);ctx.fill();
  ctx.fillStyle=GREEN;ctx.font='700 '+Math.round(15*s)+'px "Apple SD Gothic Neo",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('국산',-14*s,-8*s);
  ctx.restore();
}
function shop(x,y,s){
  s=s||1;ctx.lineWidth=3;ctx.strokeStyle=INK;
  softShadow(x,y+26*s,120*s);
  ctx.fillStyle='#FDFBF4';rr(x-56*s,y-64*s,112*s,88*s,8*s);ctx.fill();ctx.stroke();
  for(let k=0;k<6;k++){
    ctx.fillStyle=k%2?'#E85D4D':'#FFFDF6';
    ctx.fillRect(x-56*s+k*(112/6)*s,y-64*s,(112/6)*s,20*s);
  }
  ctx.strokeStyle=INK;ctx.lineWidth=3;rr(x-56*s,y-64*s,112*s,20*s,4*s);ctx.stroke();
  ctx.fillStyle=INK;ctx.font='700 '+Math.round(20*s)+'px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('버거집',x,y-18*s);
  ctx.fillStyle='#8A6F4D';rr(x-18*s,y+4*s,36*s,20*s,4*s);ctx.fill();ctx.stroke();
}

/* ============ 버거 레이어 (v2 리디자인) ============ */
/* 레이어: 0 아래번 1 양상추 2 토마토 3 치즈 4 패티 5 위번 */
function drawLayer(i,cx,y,w,faceOn){
  ctx.lineWidth=4;ctx.strokeStyle=INK;
  switch(i){
    case 0: // 아래번
      softShadow(cx,y+18,w);
      ctx.fillStyle=BUN;
      ctx.beginPath();ctx.ellipse(cx,y-14,w/2,15,0,0,Math.PI);ctx.fill();ctx.stroke();
      ctx.strokeStyle=BUN_D;ctx.lineWidth=5;ctx.beginPath();
      ctx.ellipse(cx,y-14,w/2-8,10,0,0.15*Math.PI,0.85*Math.PI);ctx.stroke();
      ctx.strokeStyle=INK;ctx.lineWidth=4;
      sheen(cx-w*0.22,y-20,w*0.15,6);
      break;
    case 1: // 양상추 (이중 물결)
      softShadow(cx,y+12,w*0.9);
      ctx.lineWidth=13;ctx.strokeStyle=LETTUCE;ctx.beginPath();
      {const n=16;for(let k=0;k<=n;k++){
        const x=cx-w/2+k*(w/n),yy=y+Math.sin(k*1.6)*8;
        k?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}}
      ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle=LETTUCE_D;ctx.beginPath();
      {const n=16;for(let k=0;k<=n;k++){
        const x=cx-w/2+k*(w/n),yy=y+5+Math.sin(k*1.6)*8;
        k?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}}
      ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle=INK;ctx.beginPath();
      {const n=16;for(let k=0;k<=n;k++){
        const x=cx-w/2+k*(w/n),yy=y-7+Math.sin(k*1.6)*8;
        k?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}}
      ctx.stroke();
      ctx.lineWidth=4;
      break;
    case 2: // 토마토 2조각 (씨앗 포함)
      softShadow(cx,y+10,w*0.7);
      for(const dx of [-w*0.19,w*0.19]){
        ctx.fillStyle=TOMATO;jellipse(cx+dx,y-8,34,10,200+dx);ctx.fill();ctx.stroke();
        ctx.fillStyle=TOMATO_L;
        ctx.beginPath();ctx.ellipse(cx+dx,y-8,22,5.5,0,0,7);ctx.fill();
        ctx.fillStyle=TOMATO_D;
        for(let s2=0;s2<4;s2++){
          ctx.beginPath();ctx.arc(cx+dx-12+s2*8,y-8+(s2%2)*3-1,2.2,0,7);ctx.fill();
        }
      }
      break;
    case 3: // 치즈 (녹아내리는 방울)
      softShadow(cx,y+8,w*0.9);
      ctx.save();ctx.translate(cx,y-10);ctx.rotate(-0.06);
      ctx.fillStyle=CHEESE;ctx.lineWidth=4;ctx.strokeStyle=INK;
      {const cw2=w*0.96;rr(-cw2/2,-11,cw2,22,7);ctx.fill();ctx.stroke();
      for(const dx of [-cw2*0.28,cw2*0.22]){
        ctx.beginPath();ctx.arc(dx,11,7,0,Math.PI);ctx.fill();ctx.stroke();
      }
      ctx.fillStyle='rgba(255,255,255,0.35)';rr(-cw2/2+10,-8,cw2-20,5,2.5);ctx.fill();}
      ctx.restore();
      break;
    case 4: // 패티 (그릴 자국 + 질감)
      softShadow(cx,y+16,w);
      ctx.fillStyle=PATTY;rr(cx-w/2,y-24,w,24,12);ctx.fill();ctx.stroke();
      ctx.strokeStyle=PATTY_D;ctx.lineWidth=5;
      for(let k=0;k<3;k++)jline(cx-w/2+18,y-17+k*6,cx+w/2-18,y-17+k*6,400+k,1.2);
      ctx.strokeStyle='rgba(255,235,200,0.28)';ctx.lineWidth=2.5;
      for(let k=0;k<8;k++){
        ctx.beginPath();ctx.arc(cx-w/2+20+rnd(k)*(w-40),y-12+rnd(k+9)*8,2,0,7);ctx.stroke();
      }
      ctx.lineWidth=4;ctx.strokeStyle=INK;
      break;
    case 5: // 위번 + 깨 + 얼굴
      softShadow(cx,y+8,w);
      ctx.fillStyle=BUN;
      ctx.beginPath();ctx.ellipse(cx,y,w/2,44,0,Math.PI,Math.PI*2);ctx.fill();ctx.stroke();
      sheen(cx-w*0.2,y-24,w*0.18,10);
      ctx.fillStyle='#FFF6DF';
      for(let k=0;k<8;k++){
        const x=cx-w/2+30+k*(w-60)/7+(rnd(300+k)-.5)*16;
        const yy=y-26-rnd(350+k)*20;
        ctx.save();ctx.translate(x,yy);ctx.rotate((rnd(300+k+9)-.5)*1.2);
        ctx.beginPath();ctx.ellipse(0,0,7.5,4.8,0,0,7);ctx.fill();
        ctx.lineWidth=2.5;ctx.strokeStyle=INK;ctx.stroke();ctx.restore();
      }
      if(faceOn)face(cx,y-4,1);
      break;
  }
}
const LAY=[0,-30,-40,-54,-78,-100]; // baseY 기준 레이어 y 오프셋 (아래→위)

/* ============ 장면 0: 타이틀 (4초) ============ */
function scTitle(t){
  const cx=W/2,baseY=400,w=380;
  softShadow(cx,baseY+22,w*1.1);
  for(let i=0;i<6;i++){
    const p=easeOB(seg(t,i*0.11,i*0.11+0.24));
    if(p<=0)continue;
    ctx.save();
    ctx.globalAlpha=clamp01(p*1.6);
    ctx.translate(0,(1-clamp01(p))*-40);
    drawLayer(i,cx,baseY+LAY[i]*(w/420),w,i===5);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha=seg(t,0.4,0.7);
  label('수제버거가 만들어지는 과정',cx,108,52);
  ctx.globalAlpha=seg(t,0.65,0.9);
  label('재료부터 차근차근, 57초',cx,164,26,GRAY,400);
  ctx.restore();
}

/* ============ 장면 1: 재료의 여정 — 어디서 왔을까? (8초) ============ */
function scOrigin(t){
  label('재료는 어디서 왔을까?',W/2,62,44);
  // --- 여정 스트립: 농장 → 트럭 → 버거집
  const fy=168;
  farm(150,fy+42,0.85);
  shop(810,fy+42,0.85);
  ctx.save();
  ctx.strokeStyle='rgba(74,55,40,0.5)';ctx.lineWidth=4;ctx.setLineDash([2,12]);
  ctx.beginPath();ctx.moveTo(252,fy+56);ctx.lineTo(708,fy+56);ctx.stroke();
  ctx.restore();
  const drive=seg(t,0.05,0.8);
  const tx=lerp(272,688,easeIO(drive));
  const bob=Math.abs(Math.sin(t*30))*5*drive*(1-seg(t,0.8,0.95));
  truck(tx,fy+22,0.9,bob);
  label('농장에서 주방까지, 재료의 여정',W/2,270,24,GRAY,400);
  // --- 재료 카드 6종
  const chips=[
    ['밀가루','우리밀 농장',iconFlour],
    ['소고기','한우',iconBeef],
    ['양상추·토마토','국내 농장',iconVeg],
    ['치즈','국내산 우유',iconCheese],
    ['깨','국내산',iconSesame],
    ['불고기 양념','한국식 레시피',iconSauce],
  ];
  const cw2=290,ch=94,gx=20,gy=12;
  const x0=(W-(cw2*3+gx*2))/2,y0=302;
  chips.forEach((c,idx)=>{
    const col=idx%3,row=(idx/3)|0;
    const p=easeOB(seg(t,0.1+idx*0.07,0.1+idx*0.07+0.2));
    if(p<=0)return;
    const x=x0+cw2/2+col*(cw2+gx),y=y0+ch/2+row*(ch+gy);
    ctx.save();
    ctx.globalAlpha=clamp01(p*1.5);
    ctx.translate(x,y);
    const sc2=Math.max(0.01,p);ctx.scale(sc2,sc2);ctx.translate(-x,-y);
    softShadow(x,y+ch/2+6,cw2*0.9);
    ctx.fillStyle='#FFFDF6';ctx.lineWidth=3.5;ctx.strokeStyle=INK;
    rr(x-cw2/2,y-ch/2,cw2,ch,18);ctx.fill();ctx.stroke();
    c[2](x-cw2/2+54,y,0.95);
    ctx.fillStyle=INK;ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.font='800 27px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
    ctx.fillText(c[0],x-cw2/2+102,y-14);
    ctx.fillStyle=GRAY;ctx.font='400 20px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
    ctx.fillText(c[1],x-cw2/2+102,y+18);
    ctx.restore();
    ctx.save();ctx.globalAlpha=clamp01(p*1.5);
    pill('국산',x+cw2/2-36,y-ch/2+4,GREEN,'#fff',19);
    ctx.restore();
  });
  ctx.textAlign='center';
}

/* ============ 장면 2: 자라는 데 걸리는 시간 — 생산 타임라인 (10초) ============ */
function scTime(t){
  label('자라는 데 걸리는 시간',W/2,56,42);
  // [이름, 개월수(0=며칠), 단계, 아이콘, 바색]
  const rows=[
    ['한우',  30,'송아지 → 비육 → 도축', iconBeef,   '#C65A4A'],
    ['밀',     7,'파종(10월) → 월동 → 수확(5월)', iconFlour,'#E8A94F'],
    ['토마토', 3,'육묘 → 정식 → 수확',   iconTomato, '#E85D4D'],
    ['참깨',   3,'파종(5월) → 개화 → 수확(8월)', iconSesame,'#B08D57'],
    ['양상추', 2,'파종 → 수확',           iconLettuce,'#8CC084'],
    ['치즈',   0,'착유 → 응고 → 가공',    iconCheese, '#F7C948'],
  ];
  const textX=186,x0=438,x1=845,maxW=x1-x0,y0=104,rh=58;
  const stageWidth=x0-textX-18;
  // 눈금 (배경)
  ctx.save();ctx.globalAlpha=seg(t,0,0.08);
  ctx.strokeStyle='rgba(74,55,40,0.3)';ctx.lineWidth=2;
  ctx.fillStyle=GRAY;ctx.font='400 17px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const m of [0,10,20,30]){
    const x=x0+(m/30)*maxW;
    jline(x,y0-8,x,y0+6*rh,4000+m,1);
    ctx.fillText(m===0?'지금':m+'개월',x,y0+6*rh+16);
  }
  ctx.restore();
  rows.forEach((r,i)=>{
    const y=y0+i*rh+rh/2;
    const ap=seg(t,i*0.07,i*0.07+0.08);
    if(ap>0){
      ctx.save();ctx.globalAlpha=ap;
      r[3](152,y,0.78);
      ctx.fillStyle=INK;ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.font='800 24px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
      ctx.fillText(r[0],textX,y-11);
      ctx.fillStyle=GRAY;ctx.font='400 16px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
      ctx.fillText(r[2],textX,y+17,stageWidth);
      ctx.restore();
    }
    const bp=easeO(seg(t,0.08+i*0.08,0.08+i*0.08+0.3));
    const fullW=r[1]===0?16:(r[1]/30)*maxW;
    const w=fullW*bp;
    if(w>1.5){
      ctx.fillStyle=r[4];ctx.strokeStyle=INK;ctx.lineWidth=3;
      rr(x0,y-13,Math.max(w,3),26,13);ctx.fill();ctx.stroke();
      sheen(x0+10,y-6,Math.max(w*0.3,4),4);
    }
    const lp=seg(t,0.08+i*0.08+0.24,0.08+i*0.08+0.34);
    if(lp>0){
      ctx.save();ctx.globalAlpha=lp;
      ctx.fillStyle=INK;ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.font='700 22px "Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
      ctx.fillText(r[1]===0?'단 며칠!':r[1]+'개월',x0+w+12,y);
      ctx.restore();
    }
  });
  const pp=seg(t,0.8,0.95);
  if(pp>0){
    ctx.save();ctx.globalAlpha=pp;
    label('소가 자라는 동안, 양상추는 열다섯 번 자랄 수 있어요',W/2,514,25,SAUCE,700);
    ctx.restore();
  }
  ctx.save();ctx.globalAlpha=0.65;
  ctx.fillStyle=GRAY;ctx.font='400 15px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillText('국내 일반적인 사육·재배 기준',W-24,28);
  ctx.restore();
  ctx.textAlign='center';
}

/* ============ 장면 3: 번 — 반죽→발효→굽기 (7초) ============ */
function scBun(t){
  const cx=W/2;
  label('번',150,80,34);
  const pa=seg(t,0.02,0.1)*(1-seg(t,0.6,0.68));
  if(pa>0){ctx.save();ctx.globalAlpha=pa;pill('우리밀 100%',W-140,80,'#E8A94F',INK,24);ctx.restore();}
  const flourA=1-seg(t,0.25,0.36),doughA=seg(t,0.22,0.36);
  ctx.save();ctx.globalAlpha=flourA;
  softShadow(cx,452,250);
  ctx.fillStyle='#fffdf5';ctx.lineWidth=4;ctx.strokeStyle=INK;
  jellipse(cx,400,120,52,11);ctx.fill();ctx.stroke();
  jline(cx-70,372,cx+70,372,12,3);
  label('밀가루',cx,478,28,GRAY,400);
  ctx.restore();
  const wp=seg(t,0.1,0.28);
  if(wp>0&&wp<1){
    ctx.strokeStyle='#7fb3d5';ctx.lineWidth=7;
    for(const dx of [-30,0,30])jline(cx+dx,180,cx+dx,180+150*wp,50+dx,2);
  }
  if(doughA>0){
    ctx.save();ctx.globalAlpha=doughA;
    const sq=Math.sin(t*40)*0.12*seg(t,0.24,0.36);
    softShadow(cx,452,250);
    ctx.fillStyle='#F3DFAE';ctx.lineWidth=4;ctx.strokeStyle=INK;
    ctx.beginPath();ctx.ellipse(cx,400,120*(1+sq),52*(1-sq),0,0,7);ctx.fill();ctx.stroke();
    sheen(cx-30,382,34,10);
    label('반죽',cx,478,28,GRAY,400);
    ctx.restore();
  }
  const fp=seg(t,0.38,0.66);
  if(fp>0){
    label('발효 중…',W/2,150,30,GRAY,400);
    for(let k=0;k<3;k++){
      const x=cx-150+k*150,r=lerp(8,52,easeO(fp));
      softShadow(x,400+r,r*2.4);
      ctx.fillStyle='#F3DFAE';ctx.lineWidth=4;ctx.strokeStyle=INK;
      ctx.beginPath();ctx.arc(x,400,r,0,7);ctx.fill();ctx.stroke();
      sheen(x-r*0.3,400-r*0.35,r*0.35,r*0.22);
      if(r>26)face(x,400,r/48);
    }
    ctx.strokeStyle='rgba(74,55,40,0.35)';ctx.lineWidth=3;
    for(let k=0;k<6;k++){
      const x=cx-180+rnd(k)*360,y=340-((t*300+k*53)%120);
      ctx.globalAlpha=0.5*(1-((t*300+k*53)%120)/120);
      jline(x,y,x+8*Math.sin(t*20+k),y-24,600+k,2);
    }
    ctx.globalAlpha=1;
  }
  const bp=seg(t,0.68,1);
  if(bp>0){
    ctx.save();ctx.globalAlpha=bp;
    label('굽기',150,80,34);
    ctx.fillStyle='#6b5a48';ctx.lineWidth=5;ctx.strokeStyle=INK;
    rr(cx-180,140,360,260,24);ctx.fill();ctx.stroke();
    ctx.fillStyle='#2e2620';rr(cx-140,190,280,150,12);ctx.fill();
    const gold=seg(t,0.78,0.98);
    const col='rgb('+Math.round(lerp(243,235,gold))+','+Math.round(lerp(227,183,gold))+','+Math.round(lerp(194,94,gold))+')';
    ctx.fillStyle=col;ctx.lineWidth=4;ctx.strokeStyle=INK;
    for(const dx of [-70,70]){
      ctx.beginPath();ctx.ellipse(cx+dx,300,52,34,0,Math.PI,Math.PI*2);ctx.fill();ctx.stroke();
      sheen(cx+dx-14,286,18,8);
    }
    ctx.strokeStyle='rgba(232,169,79,0.8)';ctx.lineWidth=4;
    for(let k=0;k<3;k++){
      const x=cx-60+k*60;
      jline(x,250+Math.sin(t*30+k)*6,x+10*Math.sin(t*24+k*2),190,700+k,3);
    }
    ctx.restore();
  }
}

/* ============ 장면 4: 패티 — 다지기→빚기→굽기 (7초) ============ */
function scPatty(t){
  const cx=W/2;
  label('패티',150,80,34);
  const pa=seg(t,0.02,0.1)*(1-seg(t,0.55,0.62));
  if(pa>0){ctx.save();ctx.globalAlpha=pa;pill('한우',W-140,80,'#C65A4A','#fff',24);ctx.restore();}
  const cp=seg(t,0,0.3);
  if(cp<1||t<0.32){
    ctx.save();ctx.globalAlpha=1-seg(t,0.28,0.34);
    softShadow(cx,412,280);
    ctx.fillStyle='#C65A4A';ctx.lineWidth=3;ctx.strokeStyle=INK;
    for(let k=0;k<5;k++){
      const p=easeO(seg(t,k*0.04,k*0.04+0.12));
      const x=cx-120+k*60,y=380-(1-p)*200;
      ctx.save();ctx.translate(x,y);ctx.rotate((rnd(k)-.5)*0.6);
      rr(-22,-16,44,32,8);ctx.fill();ctx.stroke();ctx.restore();
    }
    const bob=Math.abs(Math.sin(t*28))*36*seg(t,0.05,0.3);
    ctx.fillStyle='#cfd6dd';ctx.lineWidth=4;ctx.strokeStyle=INK;
    ctx.save();ctx.translate(cx,150+bob);ctx.rotate(0.25);
    rr(-90,-26,150,52,10);ctx.fill();ctx.stroke();
    ctx.strokeStyle=INK;jline(60,0,110,0,900,2);
    ctx.restore();
    label('다지기',W/2,470,28,GRAY,400);
    ctx.restore();
  }
  const mp=seg(t,0.32,0.58);
  if((mp>0&&mp<1)||(t>=0.32&&t<0.6)){
    ctx.save();ctx.globalAlpha=seg(t,0.32,0.4)*(1-seg(t,0.56,0.62));
    label('빚기',W/2,470,28,GRAY,400);
    const p=easeIO(mp),rx=lerp(50,110,p),ry=lerp(50,26,p);
    softShadow(cx,408,rx*2.2);
    ctx.fillStyle=PATTY;ctx.lineWidth=4;ctx.strokeStyle=INK;
    ctx.beginPath();ctx.ellipse(cx,380,rx,ry,0,0,7);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(74,55,40,0.5)';ctx.lineWidth=3;
    for(const dx of [-60,0,60])jline(cx+dx,270,cx+dx,300,950+dx,2);
    ctx.restore();
  }
  const gp=seg(t,0.6,1);
  if(gp>0){
    ctx.save();ctx.globalAlpha=gp;
    ctx.fillStyle='#3a332c';ctx.lineWidth=5;ctx.strokeStyle=INK;
    rr(cx-200,340,400,90,16);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=3;
    for(let k=0;k<4;k++)jline(cx-170+k*90,355,cx-170+k*90,415,960+k,1.5);
    const fp2=seg(t,0.82,0.92),sy=Math.abs(Math.cos(fp2*Math.PI));
    const scy=Math.max(0.15,sy);
    softShadow(cx,352,220);
    ctx.save();ctx.translate(cx,330);ctx.scale(1,scy);
    ctx.fillStyle=PATTY;ctx.lineWidth=4;ctx.strokeStyle=INK;
    rr(-95,-22,190,44,20);ctx.fill();ctx.stroke();
    ctx.strokeStyle=PATTY_D;ctx.lineWidth=4;
    jline(-75,-6,75,-6,401,1);jline(-75,4,75,4,402,1);
    if(sy>0.75)face(0,-2,0.85);
    ctx.restore();
    for(let k=0;k<8;k++){
      const a=rnd(k*3)*Math.PI*2,rr2=110+rnd(k*7)*30;
      const x=cx+Math.cos(a)*rr2,y=330+Math.sin(a)*rr2*0.5;
      ctx.globalAlpha=gp*(0.4+0.6*Math.abs(Math.sin(t*40+k*2)));
      ctx.strokeStyle='#E8A94F';ctx.lineWidth=4;
      jline(x-8,y,x+8,y,970+k,1.5);
    }
    ctx.globalAlpha=gp;
    ctx.strokeStyle='rgba(74,55,40,0.4)';ctx.lineWidth=3;
    for(let k=0;k<3;k++){
      const x=cx-70+k*70,y=290-((t*200+k*67)%90);
      jline(x,y,x+10*Math.sin(t*18+k*2),y-30,980+k,2.5);
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

/* ============ 장면 5: 쌓기 (9초) — 하이라이트 ============ */
function scStack(t){
  const cx=W/2,baseY=452,w=420;
  const landed=easeO(seg(t,0,0.72));
  ctx.fillStyle='rgba(74,55,40,'+(0.12*landed)+')';
  ctx.beginPath();ctx.ellipse(cx,baseY+14,lerp(60,190,landed),16,0,0,7);ctx.fill();
  for(let i=0;i<6;i++){
    const p=easeOB(seg(t,i*0.1,i*0.1+0.28));
    if(p<=0)continue;
    const yOff=-(1-p)*460;
    const ly=baseY+LAY[i]+yOff;
    ctx.save();
    ctx.globalAlpha=clamp01(p*1.6);
    drawLayer(i,cx,ly,w,i===5);
    ctx.restore();
    const landedI=seg(t,i*0.1+0.24,i*0.1+0.36);
    if(landedI>0)numBadge(i+1,cx+w/2+46,baseY-i*38,landedI);
  }
  const done=seg(t,0.84,1);
  if(done>0){ctx.save();ctx.globalAlpha=done;label('착착…',cx,120,40,GRAY,400);ctx.restore();}
}

/* ============ 장면 6: 한국 트위스트 — 불고기 소스 + 깨 (7초) ============ */
function scTwist(t){
  const cx=W/2,baseY=452,w=380;
  const pop=easeOB(seg(t,0,0.18));
  ctx.save();
  ctx.globalAlpha=clamp01(pop*1.6);
  ctx.translate(cx,0);ctx.scale(Math.max(0.01,pop),Math.max(0.01,pop));ctx.translate(-cx,0);
  for(let i=0;i<6;i++)drawLayer(i,cx,baseY+LAY[i]*(w/420),w,i===5);
  ctx.restore();
  if(pop<1)return;
  const topY=baseY+LAY[5]*(w/420);
  const sp=seg(t,0.18,0.42);
  if(sp>0){
    ctx.strokeStyle=SAUCE;ctx.lineWidth=9;
    const yEnd=lerp(40,topY-30,sp);
    jline(cx+20*Math.sin(t*30),30,cx+14*Math.sin(t*26+1),yEnd,1100,3);
    ctx.fillStyle=SAUCE;
    ctx.beginPath();ctx.arc(cx+14*Math.sin(t*26+1),yEnd+8,9,0,7);ctx.fill();
  }
  const zp=seg(t,0.4,0.62);
  if(zp>0){
    const n=44,x0=cx-w/2+24,x1=cx+w/2-24;
    const zy=f=>topY-32+Math.sin(f*Math.PI*5)*9;
    ctx.lineCap='round';
    ctx.strokeStyle=SAUCE;ctx.lineWidth=9;ctx.beginPath();
    for(let k=0;k<=n;k++){
      const f=k/n;if(f>zp)break;
      const x=x0+(x1-x0)*f;
      k?ctx.lineTo(x,zy(f)):ctx.moveTo(x,zy(f));
    }
    ctx.stroke();
    ctx.strokeStyle=SAUCE_L;ctx.lineWidth=3;ctx.beginPath();
    for(let k=0;k<=n;k++){
      const f=k/n;if(f>zp)break;
      const x=x0+(x1-x0)*f;
      k?ctx.lineTo(x,zy(f)-3):ctx.moveTo(x,zy(f)-3);
    }
    ctx.stroke();
  }
  const kp=seg(t,0.6,0.88);
  if(kp>0){
    for(let k=0;k<14;k++){
      const x0=cx+(rnd(k*3)-0.5)*300;
      const fall=easeO(seg(t,0.6+rnd(k*7)*0.12,0.88));
      const y=lerp(60,topY-24-rnd(k*11)*26,fall);
      ctx.save();ctx.translate(x0,y);ctx.rotate(rnd(k)*3);
      ctx.fillStyle='#FFF6DF';ctx.beginPath();ctx.ellipse(0,0,7,4.5,0,0,7);ctx.fill();
      ctx.lineWidth=2;ctx.strokeStyle=INK;ctx.stroke();ctx.restore();
    }
  }
  const lp=seg(t,0.86,1);
  if(lp>0){ctx.save();ctx.globalAlpha=lp;label('특제 불고기 소스',cx,120,40,SAUCE);ctx.restore();}
}

/* ============ 장면 7: 완성 + 크레딧 (5초) ============ */
function scDone(t){
  const cx=W/2,baseY=440,w=400;
  softShadow(cx,baseY+20,w*1.1);
  const pop=easeOB(seg(t,0,0.3));
  ctx.save();
  ctx.translate(cx,baseY);ctx.scale(Math.max(0.01,pop),Math.max(0.01,pop));ctx.translate(-cx,-baseY);
  for(let i=0;i<6;i++)drawLayer(i,cx,baseY+LAY[i]*(w/420),w,i===5);
  ctx.restore();
  const sh=seg(t,0.3,0.55);
  if(sh>0&&sh<1){
    ctx.save();ctx.globalAlpha=0.5*(1-sh);ctx.fillStyle='#fff';
    ctx.translate(cx+120,baseY-160);ctx.rotate(0.5);
    ctx.fillRect(-14,-120,28,200);ctx.restore();
  }
  ctx.save();ctx.globalAlpha=seg(t,0.35,0.6);
  label('완성! 맛있게 드세요 🍔',cx,105,46);
  ctx.restore();
  const cp=seg(t,0.6,0.9);
  if(cp>0){
    ctx.save();ctx.globalAlpha=cp;
    label('밀가루→우리밀 · 소고기→한우 · 채소→국내 농장',cx,484,22,GRAY,400);
    const sx=cx+308,sy=466;
    ctx.fillStyle='#FFF6DF';ctx.beginPath();ctx.ellipse(sx,sy,10,6.5,0.4,0,7);ctx.fill();
    ctx.lineWidth=2.5;ctx.strokeStyle=INK;ctx.stroke();
    ctx.fillStyle='#fff';ctx.lineWidth=2;ctx.strokeStyle=INK;
    rr(sx+14,sy-32,64,26,6);ctx.fill();ctx.stroke();
    jline(sx+8,sy-8,sx+16,sy-20,1200,1.5);
    label('깨소금',sx+46,sy-18,17);
    ctx.restore();
  }
}

/* ================= 타임라인 엔진 ================= */
const SCENES=[
  {dur:4, cap:'수제버거가 만들어지는 과정', draw:scTitle},
  {dur:8, cap:'먼저, 재료 소개. 밀가루는 우리밀, 소고기는 한우, 채소는 국내 농장에서 왔습니다', draw:scOrigin},
  {dur:10,cap:'재료가 자라는 시간도 제각각. 한우는 30개월, 밀은 7개월, 양상추는 두 달이면 자랍니다', draw:scTime},
  {dur:7, cap:'하나, 번. 우리밀을 반죽해 발효시키고 노릇하게 굽습니다', draw:scBun},
  {dur:7, cap:'둘, 패티. 한우를 다져 빚고 뜨거운 철판에 굽습니다', draw:scPatty},
  {dur:9, cap:'셋, 쌓기. 양상추, 토마토, 치즈, 패티를 순서대로 올립니다', draw:scStack},
  {dur:7, cap:'넷, 한국 트위스트. 특제 불고기 소스를 뿌리고 깨를 솔솔', draw:scTwist},
  {dur:5, cap:'완성! 맛있게 드세요 🍔', draw:scDone},
];
return SCENES;
}

export { createBurgerScenes };
