"""24fps rigid poses of intact clay cut-outs on a fixed miniature set.

Only translations are used. No flow, registration, contour interpolation,
anisotropic scaling or dissolves between separately generated sculpts.
"""
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
SIDE = 1080
TRACKS = {}


@lru_cache(maxsize=32)
def image(key):
    return cv2.resize(cv2.imread(str(HERE/'reference-assets'/f'{key:04d}.webp')),
        (SIDE,SIDE),interpolation=cv2.INTER_CUBIC)


def silhouette(picture, rect, saturation=48):
    """Author a solid object matte; fill pale fat flecks and bun edge details."""
    x0,y0,x1,y1=rect
    mask=np.zeros((SIDE,SIDE),np.uint8)
    hsv=cv2.cvtColor(picture,cv2.COLOR_BGR2HSV)
    mask[y0:y1,x0:x1]=np.uint8(hsv[y0:y1,x0:x1,1]>saturation)*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    result=np.zeros_like(mask)
    contours=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]
    for contour in contours:
        if cv2.contourArea(contour)>300:
            cv2.drawContours(result,[contour],-1,255,cv2.FILLED)
    return result


@lru_cache(maxsize=32)
def actor(key, rect):
    picture=image(key)
    mask=silhouette(picture,rect)
    x,y,w,h=cv2.boundingRect(mask)
    assert w and h, f'Empty authored actor: {key}, {rect}'
    # Feather only the one-pixel matte edge, never the object's texture.
    alpha=cv2.GaussianBlur(mask,(3,3),.5)
    return picture[y:y+h,x:x+w],alpha[y:y+h,x:x+w],(x+w/2,y+h/2)


def place(canvas, sprite, position):
    """Integer translation preserves every interior texel and its silhouette."""
    rgb,alpha,_=sprite
    h,w=alpha.shape
    x,y=[int(round(a-b/2)) for a,b in zip(position,(w,h))]
    x0,y0=max(x,0),max(y,0)
    x1,y1=min(x+w,SIDE),min(y+h,SIDE)
    if x1<=x0 or y1<=y0:return
    a=alpha[y0-y:y1-y,x0-x:x1-x,None].astype(np.float32)/255
    canvas[y0:y1,x0:x1]=np.uint8(rgb[y0-y:y1-y,x0-x:x1-x]*a+
        canvas[y0:y1,x0:x1]*(1-a))


@lru_cache(maxsize=2)
def griddle_plate():
    return cv2.resize(cv2.imread(str(HERE/'reference-assets'/'griddle-empty.webp')),
        (SIDE,SIDE),interpolation=cv2.INTER_CUBIC)


def linear_pose(frame, keys):
    return tuple(np.interp(frame,[k[0] for k in keys],[k[i] for k in keys])
        for i in (1,2))


def configure(frames):
    """Read complete-object positions, never a displacement/shape field."""
    global TRACKS
    tracks={name:{} for name in ('patty0','patty1','bun0','bun1','tractor')}
    for n in range(1088,1216):
        hsv=cv2.cvtColor(frames[n],cv2.COLOR_BGR2HSV)
        rows=np.indices(hsv.shape[:2])[0]
        mask=np.uint8((hsv[:,:,1]>65)&(rows>95)&(rows<285))*255
        groups={'patty':[],'bun':[]}
        for c in cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]:
            if cv2.contourArea(c)<150:continue
            moments=cv2.moments(c)
            x=moments['m10']/moments['m00']; y=moments['m01']/moments['m00']
            kind='bun' if n>=1165 and y<225 else 'patty'
            groups[kind].append((x,y))
        for kind,points in groups.items():
            points=sorted(points)
            if len(points)==1:
                i=int(points[0][0]>190)
                tracks[kind+str(i)][n]=points[0]
            else:
                for i,point in enumerate(points[:2]):tracks[kind+str(i)][n]=point
    for n in range(320,384):
        hsv=cv2.cvtColor(frames[n],cv2.COLOR_BGR2HSV)
        rows=np.indices(hsv.shape[:2])[0]
        mask=np.uint8(((hsv[:,:,0]<9)|(hsv[:,:,0]>172))&
            (hsv[:,:,1]>95)&(rows>160)&(rows<310))*255
        contours=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]
        if contours:
            c=max(contours,key=cv2.contourArea)
            x,y,w,h=cv2.boundingRect(c)
            tracks['tractor'][n]=(x+w/2,y+h/2)
    TRACKS=tracks


def source_position(name, frame, sprite, reference):
    track=TRACKS[name]
    if frame not in track:return None
    target=np.array(track[frame]);origin=np.array(track[reference])
    return np.array(sprite[2])+(target-origin)*SIDE/384


def griddle(frame):
    canvas=griddle_plate().copy()
    for i,x in enumerate((365,740)):
        # The first sculpt enters before it lands. Browning is an authored
        # material/state change at the flip, not an interpolated shape.
        cooked=frame>=1120+i*10
        cheese=frame>=1151+i*6
        key=1160 if cheese else 1128 if cooked else 1096
        rect=(190,550,510,765) if i==0 else (550,550,880,765)
        sprite=actor(key,rect)
        if TRACKS:
            position=source_position('patty'+str(i),frame,sprite,1128)
        else:
            position=sprite[2]
        if position is not None:place(canvas,sprite,position)
    if frame>=1165:
        for i,rect in enumerate(((180,390,520,580),(540,350,880,580))):
            sprite=actor(1192,rect)
            position=source_position('bun'+str(i),frame,sprite,1192) if TRACKS else sprite[2]
            if position is not None:place(canvas,sprite,position)
    return canvas


@lru_cache(maxsize=1)
def tractor_actor():
    picture=image(328)
    hsv=cv2.cvtColor(picture,cv2.COLOR_BGR2HSV)
    mask=np.zeros((SIDE,SIDE),np.uint8)
    crop=hsv[500:820,160:665]
    seed=((crop[:,:,0]<10)|(crop[:,:,0]>172))&(crop[:,:,1]>90)
    seed|=(crop[:,:,2]<80)|(crop[:,:,1]<50)
    mask[500:820,160:665]=np.uint8(seed)*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    cs=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]
    c=max(cs,key=cv2.contourArea);mask[:]=0;cv2.drawContours(mask,[c],-1,255,-1)
    x,y,w,h=cv2.boundingRect(mask)
    return picture[y:y+h,x:x+w],mask[y:y+h,x:x+w],(x+w/2,y+h/2)


@lru_cache(maxsize=1)
def wheat_plate():
    return cv2.resize(cv2.imread(str(HERE/'reference-assets'/'wheat-empty.webp')),
        (SIDE,SIDE),interpolation=cv2.INTER_CUBIC)


def sowing(frame):
    canvas=wheat_plate().copy()
    sprite=tractor_actor()
    position=source_position('tractor',frame,sprite,328) if TRACKS else sprite[2]
    if position is not None:place(canvas,sprite,position)
    return canvas


@lru_cache(maxsize=16)
def burger_part(index, width=650):
    """A newly sculpted loose ingredient, uniformly sized once at authoring."""
    sheet=cv2.imread(str(HERE/'reference-assets'/'burger-actors.webp'),cv2.IMREAD_UNCHANGED)
    h,w=sheet.shape[:2];cw,ch=w//4,h//2
    row,col=divmod(index,4)
    cell=sheet[row*ch:(row+1)*ch,col*cw:(col+1)*cw]
    rgb=cell[:,:,:3]
    # The authored sheet supplies real alpha, including the onion ring hole.
    # Hidden RGB in a transparent WebP is undefined; never use it as a matte.
    mask=np.where(cell[:,:,3]>=32,cell[:,:,3],0).astype(np.uint8)
    x,y,ww,hh=cv2.boundingRect(mask)
    rgb=rgb[y:y+hh,x:x+ww];mask=mask[y:y+hh,x:x+ww]
    scale=width/ww
    size=(width,int(round(hh*scale)))
    rgb=cv2.resize(rgb,size,interpolation=cv2.INTER_CUBIC)
    mask=cv2.resize(mask,size,interpolation=cv2.INTER_LINEAR)
    return rgb,mask,(540,0)


@lru_cache(maxsize=1)
def assembly_plate():
    return cv2.resize(cv2.imread(str(HERE/'reference-assets'/'assembly-empty.webp')),
        (SIDE,SIDE),interpolation=cv2.INTER_CUBIC)


# Authored landing frames preserve the original layer order. Occlusion is
# physical layering, not masked interpolation between completed burgers.
ASSEMBLY=[(7,1216,950),(6,1224,847),(5,1233,822),(4,1241,779),
    (3,1245,737),(2,1253,665),(1,1261,635),(0,1272,556)]


def assembly(frame):
    canvas=assembly_plate().copy()
    for index,landing,bottom in ASSEMBLY:
        if frame<landing-7:continue
        sprite=burger_part(index)
        height=sprite[1].shape[0]
        remaining=np.clip((landing-frame)/7,0,1)
        # Whole clay objects enter from the top and settle, with no reshaping.
        y=bottom-height/2-remaining*remaining*900
        place(canvas,sprite,(540,y))
    return canvas


def exploded(frame):
    canvas=paper_plate(124).copy()
    targets=(314,454,544,632,728,809,894,986)
    for index,_,bottom in ASSEMBLY:
        sprite=burger_part(index,310)
        h=sprite[1].shape[0]
        assembled=bottom*.85+115-h/2
        # Earlier/lower layers separate later, matching the original diagram.
        target=targets[index]
        start=64+(7-index)*2
        p=np.clip((frame-start)/27,0,1);p=p*p*(3-2*p)
        place(canvas,sprite,(610,assembled+(target-assembled)*p))
    return canvas


@lru_cache(maxsize=8)
def person(index):
    rgba=people_sheet()
    edges=(0,174,332,479,630,773,929,1080)
    x0,x1=edges[index:index+2]
    cell=rgba[440:810,x0:x1]
    mask=np.where(cell[:,:,3]>=32,cell[:,:,3],0).astype(np.uint8)
    x,y,w,h=cv2.boundingRect(mask)
    return cell[y:y+h,x:x+w,:3],mask[y:y+h,x:x+w],(x0+x+w/2,440+y+h/2)


@lru_cache(maxsize=2)
def paper_plate(key):
    base=np.median(image(key)[40:200,40:1040],axis=(0,1))
    grain=np.random.default_rng(46).normal(0,.55,(SIDE,SIDE,1))
    return np.uint8(np.clip(base+grain,0,255))


@lru_cache(maxsize=1)
def people_sheet():
    rgba=cv2.imread(str(HERE/'reference-assets'/'people-actors.webp'),cv2.IMREAD_UNCHANGED)
    return cv2.resize(rgba,(SIDE,SIDE),interpolation=cv2.INTER_CUBIC)


def people(frame):
    canvas=paper_plate(1416).copy()
    for i in range(7):
        landing=1348+i*8
        if frame<landing-4:continue
        sprite=person(i);x,y=sprite[2]
        remaining=np.clip((landing-frame)/4,0,1)
        place(canvas,sprite,(x,y-remaining*remaining*160))
    if frame>=1402:
        rgba=people_sheet()
        cell=rgba[300:440,440:680];mask=np.where(cell[:,:,3]>=32,cell[:,:,3],0).astype(np.uint8)
        x,y,w,h=cv2.boundingRect(mask)
        if w and h:
            sprite=cell[y:y+h,x:x+w,:3],mask[y:y+h,x:x+w],(0,0)
            place(canvas,sprite,(440+x+w/2+9*np.sin((frame-1402)*.12),
                300+y+h/2+5*np.sin((frame-1402)*.2)))
    return canvas


def render(frame):
    if 64<=frame<128:
        return exploded(frame)
    if 320<=frame<384:
        return sowing(frame)
    if 1088<=frame<1216:
        return griddle(frame)
    if 1216<=frame<1280:
        return assembly(frame)
    if 1344<=frame<1472:
        return people(frame)
    return None
