"""Fixed Korean clay geography; rigid, stepped delivery animation, never warps.

Ingredient locations/routes are illustrative, explicitly labelled on screen.
Regional origins are illustrative; the delivery paths follow attributed roads.
"""
from functools import lru_cache
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
SIDE = 1080
TERRAIN = HERE/'reference-assets'/'korea-terrain.png'
ROADS = json.loads((HERE/'korea-road-routes.json').read_text())


def project(lon, lat):
    return (540+(lon-126.8)*math.cos(math.radians(36))*150, 640-(lat-36)*150)


DESTINATION = project(126.9780, 37.5665)  # Seoul
# Approximate regional diagram pins, not claimed farm/supplier coordinates.
NODES = [
    ('전라도\n우리밀', (126.6,34.75), (260,810), '#e7bb59'),
    ('토마토', (126.9,36.28), (260,615), '#dc7063'),
    ('오이', (127.2,36.83), (275,540), '#79b86f'),
    ('대관령\n한우 목장', (128.71,37.68), (835,348), '#c69b75'),
    ('낙농장', (127.27,37.0), (285,463), '#96b7ca'),
    ('양상추', (128.25,35.32), (850,770), '#acd478'),
]


@lru_cache(maxsize=12)
def font(size):
    return ImageFont.truetype(str(HERE/'fonts'/'NanumSquareRoundB.ttf'),size)


@lru_cache(maxsize=2)
def background(night):
    terrain = Image.open(TERRAIN).convert('RGBA')
    assert terrain.size == (SIDE,SIDE), 'Rebuild the fixed 1080-square terrain'
    rng = np.random.default_rng(38)
    grain = rng.normal(0,.65,(SIDE,SIDE,1))
    base = np.array((18,24,43) if night else (248,241,222))
    plate = Image.fromarray(np.uint8(np.clip(base+grain,0,255))).convert('RGBA')
    shadow = Image.new('RGBA',plate.size,(0,0,0,0))
    alpha = terrain.getchannel('A').filter(ImageFilter.GaussianBlur(10))
    shadow.putalpha(alpha.point(lambda v:int(v*.27)))
    plate.alpha_composite(shadow,(5,10))
    if night:
        rgb=np.asarray(terrain).copy()
        rgb[:,:,:3]=np.clip(rgb[:,:,:3]*np.array((.31,.38,.53))+(15,19,29),0,255)
        terrain=Image.fromarray(rgb)
    plate.alpha_composite(terrain)
    return plate.convert('RGB')


@lru_cache(maxsize=6)
def route(index):
    """Project stored road-network geometry; never replace it with a chord."""
    return np.array([project(*p) for p in ROADS['routes'][index]['coordinates']])


def route_prefix(index, progress):
    """Constant-speed arc-length travel, including a sub-segment truck pose."""
    points=route(index)
    distance=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    travelled=float(np.clip(progress,0,1))*distance[-1]
    segment=min(np.searchsorted(distance,travelled,side='right')-1,len(points)-2)
    fraction=(travelled-distance[segment])/(distance[segment+1]-distance[segment])
    tip=points[segment]+fraction*(points[segment+1]-points[segment])
    return np.vstack((points[:segment+1],tip))


def truck(draw,x,y,colour):
    # The glyph is drawn intact at each position: translation only.
    x,y=int(round(x)),int(round(y))
    draw.rounded_rectangle((x-15,y-10,x+14,y+7),radius=4,fill='#28343d')
    draw.rounded_rectangle((x-15,y-13,x+5,y+3),radius=4,fill='#e8e4d8')
    draw.rounded_rectangle((x+4,y-10,x+15,y+3),radius=3,fill=colour)
    draw.rectangle((x+8,y-7,x+12,y-2),fill='#7795a3')
    draw.line((x-11,y-10,x+1,y-10),fill='#fff7df',width=2)
    for wheel in (-8,9):
        draw.ellipse((x+wheel-3,y+2,x+wheel+3,y+8),fill='#303442')


@lru_cache(maxsize=8)
def map_pose(step,night):
    image=background(night).copy()
    draw=ImageDraw.Draw(image)
    ink='#bccddd' if night else '#40566c'
    leader='#71849b' if night else '#a9b9ad'
    progress=np.clip((step-840)/120,0,1)
    for i,(label,location,(lx,ly),colour) in enumerate(NODES):
        x,y=project(*location)
        points=route_prefix(i,progress)
        if len(points)>1:
            p=[tuple(v) for v in points]
            draw.line([(a+2,b+3) for a,b in p],fill='#23343a' if night else '#7a8e6f',width=9)
            draw.line(p,fill=colour,width=6)
            truck(draw,*p[-1],colour)
        draw.line(((lx+42,ly+34),(x,y)),fill=leader,width=2)
        draw.ellipse((x-10,y-10,x+10,y+10),fill='#566f62')
        draw.ellipse((x-8,y-9,x+8,y+7),fill=colour)
        draw.arc((x-5,y-7,x+6,y+3),180,285,fill='#fff1cd',width=2)
        draw.multiline_text((lx,ly),label,font=font(29),fill=ink,spacing=4,align='center')
    x,y=DESTINATION
    star=[]
    for i in range(10):
        angle=-math.pi/2+i*math.pi/5
        radius=19 if i%2==0 else 8
        star.append((x+radius*math.cos(angle),y+radius*math.sin(angle)))
    draw.polygon(star,fill='#f7d06b')
    draw.line(((444,381),(x-22,y-3)),fill=leader,width=2)
    draw.text((300,330),'서울',font=font(37),fill=ink)
    draw.text((255,377),'제빵소 / 패티 / 점심',font=font(25),fill=ink)
    # The original map has a small N arrow; retain that unobtrusive convention.
    draw.line((90,905,90,867),fill=ink,width=2)
    draw.polygon(((90,861),(86,870),(94,870)),fill=ink)
    draw.text((83,832),'N',font=font(20),fill=ink)
    # Natural Earth's eastern polygon spans 130.81–130.93E, 37.45–37.55N:
    # Ulleungdo, not an invented offshore decoration.
    island=project(130.872,37.501)
    draw.line(((1011,441),(island[0],island[1]+8)),fill=leader,width=1)
    draw.text((962,443),'울릉도',font=font(25),fill=ink)
    # Equirectangular projection: ~111.32 km/latitude degree, 150 px/degree.
    bar=100/111.32*150
    draw.line((75,987,75+bar,987),fill=ink,width=2)
    for xx in (75,75+bar):draw.line((xx,980,xx,994),fill=ink,width=2)
    draw.text((94,998),'100 km',font=font(23),fill=ink)
    draw.text((690,1017),'산지와 배송 경로 예시',font=font(25),fill=ink)
    draw.text((690,1050),'도로 © OpenStreetMap 기여자',font=font(18),fill=ink)
    return np.asarray(image)


def render(frame):
    step=frame  # Rigid trucks advance every frame, not in four-frame jumps.
    if frame<=924:
        rgb=map_pose(step,True)
    elif frame>=988:
        rgb=map_pose(step,False)
    else:
        # A moving reveal over identical geometry, not a morph between maps.
        yy,xx=np.ogrid[:SIDE,:SIDE]
        edge=SIDE-1350*(frame-924)/64+.25*yy
        rgb=np.where((xx>edge)[:,:,None],map_pose(step,False),map_pose(step,True))
    return cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR)
