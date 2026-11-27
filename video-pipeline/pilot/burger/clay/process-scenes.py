"""Source-timed process miniatures, assembled from fixed sets and intact parts.

No contour flow, correspondence field, image morph or frame cross-fade. Moving
parts translate/rotate as whole objects. Uniform sizing represents actual flower
growth and dough rising; it never changes an object's aspect ratio.
"""
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

HERE=Path(__file__).resolve().parent
SIDE=1080
R=None


def configure(rigid, frames=None):
    global R
    R=rigid


@lru_cache(maxsize=24)
def plate(name):
    value=cv2.imread(str(HERE/'reference-assets'/name))
    assert value is not None, name
    return cv2.resize(value,(SIDE,SIDE),interpolation=cv2.INTER_CUBIC)


def cropped(rgb, alpha, position=(0,0), width=None):
    x,y,w,h=cv2.boundingRect(np.uint8(alpha>=32))
    assert w and h, 'Empty authored sprite'
    rgb=rgb[y:y+h,x:x+w];alpha=alpha[y:y+h,x:x+w]
    if width is not None:
        size=(width,max(1,round(h*width/w)))
        rgb=cv2.resize(rgb,size,interpolation=cv2.INTER_CUBIC)
        alpha=cv2.resize(alpha,size,interpolation=cv2.INTER_CUBIC)
    return rgb,alpha,position


@lru_cache(maxsize=50)
def part(name,index=0,cols=2,rows=2,width=150):
    sheet=cv2.imread(str(HERE/'reference-assets'/name),cv2.IMREAD_UNCHANGED)
    assert sheet is not None and sheet.shape[2]==4, name
    h,w=sheet.shape[:2];row,col=divmod(index,cols)
    cell=sheet[row*h//rows:(row+1)*h//rows,col*w//cols:(col+1)*w//cols]
    alpha=cell[:,:,3]
    if name.startswith('drive-in-') and name.endswith('actors.webp'):
        # Ignore faint atlas-divider lines: they are not part of a car/person.
        _,labels,stats,_=cv2.connectedComponentsWithStats(np.uint8(alpha>=32))
        label=1+np.argmax(stats[1:,cv2.CC_STAT_AREA])
        alpha=np.where(labels==label,alpha,0).astype(np.uint8)
    return cropped(cell[:,:,:3],alpha,width=width)


def similarity(sprite, scale=1, angle=0):
    """A similarity pose preserves all lengths' ratios: no anisotropic stretch."""
    rgb,alpha,position=sprite
    rgba=Image.fromarray(np.dstack((rgb,alpha)))
    if scale!=1:
        rgba=rgba.resize((max(1,round(rgba.width*scale)),
            max(1,round(rgba.height*scale))),Image.Resampling.BICUBIC)
    if angle:
        rgba=rgba.rotate(float(angle),resample=Image.Resampling.BICUBIC,expand=True)
    result=np.array(rgba)
    return result[:,:,:3],result[:,:,3],position


def ease(value):
    t=float(np.clip(value,0,1))
    return t*t*(3-2*t)


def path(frame, keys):
    return tuple(np.interp(frame,[k[0] for k in keys],[k[i] for k in keys])
        for i in (1,2))


@lru_cache(maxsize=24)
def cutout(key,rect):
    pic=R.image(key);x0,y0,x1,y1=rect
    cell=pic[y0:y1,x0:x1]
    hsv=cv2.cvtColor(cell,cv2.COLOR_BGR2HSV)
    mask=np.uint8((hsv[:,:,1]>58)|(hsv[:,:,2]<204))*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    solid=np.zeros_like(mask)
    for contour in cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]:
        if cv2.contourArea(contour)>20:cv2.drawContours(solid,[contour],-1,255,-1)
    x,y,w,h=cv2.boundingRect(solid)
    return cropped(cell,solid,(x0+x+w/2,y0+y+h/2))


def dairy(frame):
    canvas=R.paper_plate(440).copy()
    for start,rect in zip((384,398,414,428),
            ((35,250,525,618),(540,250,1055,625),
             (35,630,525,1020),(540,630,1060,1020))):
        if frame<start:continue
        x0,y0,x1,y1=rect
        cell=R.image(440)[y0:y1,x0:x1]
        # White cow legs and pale milk are part of the sculpt, not a chroma key.
        alpha=np.full(cell.shape[:2],255,np.uint8)
        alpha[:4]=0;alpha[-4:]=0;alpha[:,:4]=0;alpha[:,-4:]=0
        alpha=cv2.GaussianBlur(alpha,(9,9),2)
        sprite=cell,alpha,(0,0);x,y=(x0+x1)/2,(y0+y1)/2
        R.place(canvas,sprite,(x,y+65*(1-ease((frame-start)/8))))
    return canvas


def garden(frame):
    canvas=plate('flower-empty.webp').copy()
    if frame<530:
        flower=part('garden-actors.webp',0,width=310)
        bloom=.32+.68*ease((frame-448)/25)
        R.place(canvas,similarity(flower,bloom),(655,637))
    else:
        fruit=part('garden-actors.webp',1,width=320)
        growth=.4+.6*ease((frame-530)/14)
        R.place(canvas,similarity(fruit,growth),(606,649))
    if 463<=frame<529:
        bee=part('garden-actors.webp',2,width=115)
        x,y=path(frame,[(463,1120,400),(476,620,675),(504,650,582),
            (516,820,430),(529,1160,140)])
        R.place(canvas,similarity(bee,angle=4*np.sin(frame*.3)),
            (x+7*np.sin(frame*.8),y+4*np.cos(frame*.7)))
    if frame>=550:
        pickles=part('garden-actors.webp',3,width=252)
        R.place(canvas,pickles,(900,368+45*(1-ease((frame-550)/8))))
        cv2.arrowedLine(canvas,(735,590),(820,424),(71,100,170),3,cv2.LINE_AA,tipLength=.07)
        for i in range(5):
            cx,cy=548+i*30,590+i*30
            cv2.line(canvas,(cx-37,cy+37),(cx+37,cy-37),(169,142,110),2,cv2.LINE_AA)
    if frame>=558:
        jar=cutout(568,(805,495,1000,737));x,y=jar[2]
        R.place(canvas,jar,(x,y+55*(1-ease((frame-558)/8))))
        cv2.arrowedLine(canvas,(907,487),(907,527),(71,100,170),3,cv2.LINE_AA,tipLength=.2)
    return canvas


def harvest(frame):
    canvas=plate('harvest-empty.webp').copy()
    truck=part('truck-korea-actor.webp',0,1,1,360)
    x,y=path(frame,[(576,1210,851),(595,790,851),(613,790,851),(639,1230,851)])
    if 592<=frame<617:
        # Individual clay grain beads fall from the real pipe into the truck.
        for i in range(22):
            phase=((frame-592)*.085+i/22)%1
            yy=318+phase*570
            xx=778+5*np.sin(i*3.1)
            cv2.ellipse(canvas,(round(xx),round(yy)),(3,5),12,0,360,(48,146,211),-1,cv2.LINE_AA)
    R.place(canvas,truck,(x,y))
    if frame>=624:
        inset=R.image(632)[875:1080,855:1080]
        sprite=inset,np.full(inset.shape[:2],255,np.uint8),(0,0)
        R.place(canvas,sprite,(967,977+220*(1-ease((frame-624)/9))))
    return canvas


GRINDER_OUTLET=(486,626)


def grinder_flow(canvas):
    """Attach authored meat strands to the actual outlet, not empty air."""
    strands=part('grinder-actors.webp',2,width=130)
    rgb,alpha,_=strands;h,w=alpha.shape
    origin=np.array((485,647))
    # Each clay rope starts inside the metal lip and joins an opaque texel of
    # the fan. The source asset supplies its surface and constant silhouette.
    for i,x in enumerate(np.linspace(w*.23,w*.57,7)):
        column=round(x);ys=np.flatnonzero(alpha[:,column]>180)
        if not len(ys):continue
        end=origin+np.array((column,int(ys[0])+8))
        start=np.array(GRINDER_OUTLET)+np.array((-6,(i-3)*3))
        control=np.array((end[0],GRINDER_OUTLET[1]-2))
        t=np.linspace(0,1,30)[:,None]
        curve=np.int32((1-t)**2*start+2*(1-t)*t*control+t*t*end)
        cv2.polylines(canvas,[curve],False,(61,64,167),8,cv2.LINE_AA)
        cv2.polylines(canvas,[curve],False,(86,90,211),4,cv2.LINE_AA)
        for px,py in curve[4+i%3::7]:
            cv2.circle(canvas,(int(px),int(py)),1,(139,144,233),-1,cv2.LINE_AA)
    R.place(canvas,strands,origin+np.array((w/2,h/2)))


def grinder(frame):
    canvas=plate('grinder-empty.webp').copy()
    grinder_flow(canvas)
    ball=part('grinder-actors.webp',0,width=45)
    flat=part('grinder-actors.webp',1,width=90)
    for i,start in enumerate((652,658,664,670)):
        age=frame-start
        if 0<=age<24:
            R.place(canvas,similarity(ball,angle=-age*18),(470+age*14.3,846))
        elif age>=24:
            R.place(canvas,flat,(974,875-i*11))
    # The moving cylinder/foot is independent of the fixed support beam.
    cycle=(frame-668)%7
    yy=705+145*(np.sin(cycle/7*np.pi)**2) if frame>=668 else 705
    cv2.line(canvas,(815,round(yy-430)),(815,round(yy-15)),(125,132,134),7,cv2.LINE_AA)
    cv2.line(canvas,(813,round(yy-430)),(813,round(yy-15)),(193,201,203),2,cv2.LINE_AA)
    whole=part('grinder-actors.webp',3,width=110)
    rgb,alpha,_=whole;h=alpha.shape[0]
    foot=rgb[round(h*.75):],alpha[round(h*.75):],(0,0)
    R.place(canvas,foot,(815,yy))
    return canvas


@lru_cache(maxsize=1)
def workers():
    rgba=cv2.imread(str(HERE/'reference-assets'/'harvest-korea-worker-actors.webp'),-1)
    rgba=cv2.resize(rgba,(SIDE,SIDE),interpolation=cv2.INTER_CUBIC)
    _,labels,stats,_=cv2.connectedComponentsWithStats(np.uint8(rgba[:,:,3]>=32))
    out=[]
    for label in sorted(range(1,len(stats)),key=lambda i:stats[i,0]):
        x,y,w,h,area=stats[label]
        if area<500:continue
        mask=np.where(labels[y:y+h,x:x+w]==label,rgba[y:y+h,x:x+w,3],0)
        out.append((rgba[y:y+h,x:x+w,:3],mask,(x+w/2,y+h)))
    assert len(out)==7
    return out


def feet_pose(sprite, angle):
    rgb,alpha,_=sprite;h,w=alpha.shape
    side=2*max(h,w)+8
    rgba=Image.new('RGBA',(side,side))
    rgba.paste(Image.fromarray(np.dstack((rgb,alpha))),
        (round(side/2-w/2),round(side/2-h)))
    posed=np.array(rgba.rotate(float(angle),resample=Image.Resampling.BICUBIC))
    return posed[:,:,:3],posed[:,:,3],(0,0)


@lru_cache(maxsize=20)
def harvest_piece(row,col,component=0,height=100):
    sheet=cv2.imread(str(HERE/'reference-assets'/'harvest-puppet-parts.webp'),-1)
    h,w=sheet.shape[:2]
    cell=sheet[row*h//2:(row+1)*h//2,col*w//4:(col+1)*w//4]
    _,labels,stats,_=cv2.connectedComponentsWithStats(np.uint8(cell[:,:,3]>=32))
    ids=sorted((i for i in range(1,len(stats)) if stats[i,4]>500),key=lambda i:stats[i,1])
    label=ids[component]
    rgb,alpha,_=cropped(cell[:,:,:3],np.where(labels==label,cell[:,:,3],0).astype(np.uint8))
    size=(round(rgb.shape[1]*height/rgb.shape[0]),height)
    return cv2.resize(rgb,size,interpolation=cv2.INTER_CUBIC),\
        cv2.resize(alpha,size,interpolation=cv2.INTER_LINEAR),(0,0)


def rotate_point(point,pivot,angle):
    dx,dy=np.subtract(point,pivot);a=np.deg2rad(angle)
    return np.array((np.cos(a)*dx+np.sin(a)*dy,-np.sin(a)*dx+np.cos(a)*dy))


def arm_joints(shoulder,hand,upper=65,lower=68):
    """Two fixed-length limbs reach the hand target without scaling a sculpt."""
    delta=np.subtract(hand,shoulder);distance=np.linalg.norm(delta)
    direction=delta/max(distance,.001)
    distance=float(np.clip(distance,abs(upper-lower)+.01,upper+lower-.01))
    hand=np.array(shoulder)+direction*distance
    along=(upper*upper-lower*lower+distance*distance)/(2*distance)
    across=np.sqrt(max(0,upper*upper-along*along))
    # Left-facing workers bend the elbow back/down. The other IK branch folds
    # it toward the face and makes the forearm look attached backwards.
    elbow=np.array(shoulder)+along*direction-across*np.array((-direction[1],direction[0]))
    return np.array(shoulder),elbow,hand


def harvest_action(frame,index):
    t=float(np.clip(frame-704+index*5,0,63))
    foot=np.array(((590,811),(926,981))[index],dtype=float)
    bend=np.interp(t,(0,20,26,45,63),(10,60,60,15,10))
    hand=foot+np.array((np.interp(t,(0,20,26,45,51,63),(-45,-92,-92,55,55,-45)),
        np.interp(t,(0,20,26,45,51,63),(-86,-36,-36,-86,-86,-86))))
    return t,foot,float(bend),hand,26<=t<49,t>=49


def picking(frame):
    canvas=plate('hand-harvest-empty.webp').copy()
    # Feet stay planted. The torso bends at the hips, two rigid arm segments
    # reach a crop, lift it and release it into a basket. No whole-person sway.
    for index,height in enumerate((238,260)):
        t,foot,bend,target,holding,deposited=harvest_action(frame,index)
        body=harvest_piece(index,0,height=height)
        rgb,alpha,_=body;h,w=alpha.shape
        pivot=(w*.67,h*.53);hip=foot-np.array((0,h-pivot[1]))
        legs=alpha.copy();legs[:round(pivot[1])]=0
        R.place(canvas,(rgb,legs,(0,0)),foot+np.array((w/2-pivot[0],-h/2)))
        torso=alpha.copy();torso[round(pivot[1]+h*.025):]=0
        R.place(canvas,pivot_pose((rgb,torso,(0,0)),pivot,bend),hip)
        shoulder=hip+rotate_point((w*.65,h*.29),pivot,bend)
        joints=arm_joints(shoulder,target)
        for col,(a,b),length in zip((1,2),zip(joints,joints[1:]),(65,68)):
            limb=harvest_piece(index,col,height=length+10)
            dx,dy=b-a;angle=np.degrees(np.arctan2(dx,dy))
            R.place(canvas,similarity(limb,angle=angle),(a+b)/2)
        crop=harvest_piece(index,3,0,30)
        if t<26:
            R.place(canvas,crop,foot+(-92,-31))
        elif holding:
            R.place(canvas,crop,joints[-1]+(-5,9))
        basket=harvest_piece(index,3,1,51)
        R.place(canvas,basket,foot+(55,-40))
        if deposited:
            R.place(canvas,crop,foot+(55,-66))
    return canvas


@lru_cache(maxsize=1)
def door_bounds():
    pic=plate('bakery-empty.webp');hsv=cv2.cvtColor(pic,cv2.COLOR_BGR2HSV)
    mask=np.uint8((hsv[:,:,0]>9)&(hsv[:,:,0]<30)&
        (hsv[:,:,1]>90)&(hsv[:,:,2]>70))*255
    mask[:480]=0;mask[:,:570]=0;mask[850:]=0
    cs=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]
    return cv2.boundingRect(max(cs,key=cv2.contourArea))


def bakery(frame):
    canvas=plate('bakery-empty.webp').copy()
    x,y,w,h=door_bounds()
    opening=ease((frame-784)/6)*(1-ease((frame-807)/7))
    if opening:
        cv2.rectangle(canvas,(x,y),(x+w,y+h),(27,26,33),-1)
        door=plate('bakery-empty.webp')[y:y+h,x:x+w]
        R.place(canvas,(door,np.full((h,w),255,np.uint8),(0,0)),
            (x+w/2,y+h/2+opening*560))
    shift=550*ease((frame-790)/9)*(1-ease((frame-807)/9))
    tray=np.array([(45,687),(505,687),(530,817),(22,817)],np.int32)
    tray+=np.array([round(shift),round(-shift*.11)])
    cv2.fillConvexPoly(canvas,tray,(102,113,123),cv2.LINE_AA)
    cv2.polylines(canvas,[tray],True,(173,181,185),5,cv2.LINE_AA)
    for row in range(3):
        for col in range(4):
            bun=R.burger_part(0,92)
            rgb,alpha,_=bun
            baked=ease((frame-799)/10)
            pale=np.clip(rgb.astype(float)*.45+np.array([151,164,166]),0,255)
            material=np.uint8(pale*(1-baked)+rgb*baked)
            rise=.72+.28*ease((frame-768)/19)
            R.place(canvas,similarity((material,alpha,(0,0)),rise),
                (97+col*111+shift,708+row*37-shift*.11))
    # Coordinates are on the resized 1080 plate: the previous x=256 was a
    # detached pivot, left of the physical clock's center at (301,338).
    center=CLOCK_CENTER
    minutes=210+75*(frame-768)/63  # 03:30 to 04:45, minute:hour rate 12:1.
    for length,angle,width in [(44,minutes*np.pi/30,3),(30,minutes*np.pi/360,4)]:
        end=(round(center[0]+length*np.sin(angle)),round(center[1]-length*np.cos(angle)))
        cv2.line(canvas,center,end,(57,58,64),width,cv2.LINE_AA)
    cv2.circle(canvas,center,5,(57,58,64),-1,cv2.LINE_AA)
    return canvas


CLOCK_CENTER=(301,338)


@lru_cache(maxsize=12)
def slice_piece(index,piece=0,width=140):
    sheet=cv2.imread(str(HERE/'reference-assets'/'slicing-actors.webp'),-1)
    h,w=sheet.shape[:2];row,col=divmod(index,2)
    cell=sheet[row*h//3:(row+1)*h//3,col*w//2:(col+1)*w//2]
    _,labels,stats,_=cv2.connectedComponentsWithStats(np.uint8(cell[:,:,3]>=32))
    ids=sorted([i for i in range(1,len(stats)) if stats[i,4]>500],key=lambda i:stats[i,0])
    label=ids[piece]
    return cropped(cell[:,:,:3],np.where(labels==label,cell[:,:,3],0).astype(np.uint8),width=width)


def slicing(frame):
    canvas=plate('slicing-empty.webp').copy()
    for i,sign in enumerate((-1,1)):
        gap=38*ease((frame-1030)/10)
        R.place(canvas,slice_piece(0,i,78),(300+sign*(39+gap),513))
        gap=24*ease((frame-1050)/11)
        R.place(canvas,slice_piece(2,i,74),(590+sign*(37+gap),513))
    R.place(canvas,slice_piece(4,0,225),(836,513))
    for i in range(4):
        start=1038+i*3
        if frame>=start:
            R.place(canvas,slice_piece(1,0,155),(240+i*88,
                715+i*10-140*(1-ease((frame-start)/8))))
    if frame>=1061:
        R.place(canvas,slice_piece(3,0,151),(662,726-120*(1-ease((frame-1061)/8))))
    for i,start in enumerate((1070,1077)):
        if frame>=start:
            R.place(canvas,slice_piece(5,i,147),(800+i*100,
                750+i*45-120*(1-ease((frame-start)/8))))
    if frame<1041:
        for i in range(3):
            xx=278+i*20
            cv2.line(canvas,(xx,425),(xx,600),(164,147,116),2,cv2.LINE_AA)
    elif frame<1062:
        for i in range(3):
            xx=567+i*20
            cv2.line(canvas,(xx,425),(xx,600),(164,147,116),2,cv2.LINE_AA)
    return canvas


def drive_in(frame):
    canvas=plate('drive-in-korea-empty.webp').copy()
    teal=part('drive-in-korea-actors.webp',0,width=680)
    red=part('drive-in-korea-actors.webp',1,width=680)
    server=part('drive-in-korea-actors.webp',2,width=125)
    exit=ease((frame-1311)/13)
    R.place(canvas,teal,(710-exit*1200,1045-teal[1].shape[0]/2))
    enter=ease((frame-1320)/13)
    R.place(canvas,red,(1600-enter*890,1045-red[1].shape[0]/2))
    R.place(canvas,server,(531,1045-server[1].shape[0]/2))
    return canvas


def pivot_pose(sprite,pivot,angle):
    rgb,alpha,_=sprite;h,w=alpha.shape
    side=2*int(np.ceil(np.hypot(w,h)))+8
    rgba=Image.new('RGBA',(side,side))
    rgba.paste(Image.fromarray(np.dstack((rgb,alpha))),
        (round(side/2-pivot[0]),round(side/2-pivot[1])))
    posed=np.array(rgba.rotate(float(angle),resample=Image.Resampling.BICUBIC))
    return posed[:,:,:3],posed[:,:,3],(0,0)


def cow(canvas,sprite,position,frame):
    # This sculpt has no separately authored neck joint. Never cut a rectangle
    # out of it and rotate the head: that exposes a hole through the shoulder.
    R.place(canvas,sprite,position)
    rgb,alpha,_=sprite;h,w=alpha.shape
    blink=max(0,1-abs(frame%71-59)/3)
    if not blink:return
    yy,xx=np.indices(alpha.shape)
    pupils=np.uint8((rgb.max(axis=2)<75)&(alpha>220)&(xx>w*.7)&(yy<h*.87))
    count,labels,stats,centers=cv2.connectedComponentsWithStats(pupils)
    if count<2:return
    label=1+np.argmax(stats[1:,cv2.CC_STAT_AREA])
    ex,ey=centers[label];ew,eh=stats[label,2:4]
    if not .35<ew/max(eh,1)<2.5:return
    colour=tuple(int(v) for v in rgb[max(0,round(ey)-eh-2),round(ex)])
    center=(round(position[0]-w/2+ex),round(position[1]-h/2+ey))
    cv2.ellipse(canvas,center,(max(1,round(ew/2)),max(1,round(eh/2*blink))),
        0,0,360,colour,-1,cv2.LINE_AA)


def grounded_cow(canvas,sprite,x,ground_y,frame):
    cow(canvas,sprite,(x,ground_y-sprite[1].shape[0]/2),frame)


def pasture(frame):
    canvas=plate('pasture-empty.webp').copy()
    if frame<256:
        mother=part('mother-cow-actor.webp',0,1,1,570)
        cow(canvas,mother,(357,690),frame)
        pose=min(7,max(0,(frame-160)//3))
        calf=part('calf-rise-poses.webp',pose,4,2,210)
        R.place(canvas,calf,(733,871-calf[1].shape[0]/2))
    else:
        adult=part('grazing-cow-actor.webp',0,1,1,620)
        # This is the grown-animal shot, not a mother nudging a newborn.
        # Keep its complete pose fixed: the old sideways slide hit the calf.
        if frame>=298:
            small=part('grazing-cow-actor.webp',0,1,1,150)
            grounded_cow(canvas,small,112,836,frame+13)
            grounded_cow(canvas,small,900,916,frame+31)
        cow(canvas,adult,(385,710),frame)
        if frame>=298:
            # Deterministic weather motion; the terrain and cow bodies stay fixed.
            for i in range(48):
                x=(i*139+frame*2)%1080;y=310+(i*67+frame*9)%610
                cv2.line(canvas,(x,y),(x-4,y+13),(197,191,170),1,cv2.LINE_AA)
    return canvas


def render(frame):
    if 128<=frame<320:return pasture(frame)
    if 384<=frame<448:return dairy(frame)
    if 448<=frame<576:return garden(frame)
    if 576<=frame<640:return harvest(frame)
    if 640<=frame<704:return grinder(frame)
    if 704<=frame<768:return picking(frame)
    if 768<=frame<832:return bakery(frame)
    if 1024<=frame<1088:return slicing(frame)
    if 1280<=frame<1344:return drive_in(frame)
    # One authored bite at its source frame; no later camera/texture jumps.
    if 1472<=frame<1536:return R.image(1480 if frame<1488 else 1496).copy()
    return None
