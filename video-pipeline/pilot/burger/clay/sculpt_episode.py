"""Original miniature sets for the complete 57-second burger episode.

Run with Blender: --python sculpt_episode.py -- assets [group-substring] [pose]
The two-scene sculpt.py remains the shared food/prop construction library.
"""
import os
import sys
import math
import importlib.util
import bpy
from mathutils import Vector

spec=importlib.util.spec_from_file_location('clay_parts',os.path.join(os.path.dirname(__file__),'sculpt.py'))
parts=importlib.util.module_from_spec(spec); spec.loader.exec_module(parts)
ball,block,rope,rod,ring,puck,lathe=parts.ball,parts.block,parts.rope,parts.rod,parts.ring,parts.puck,parts.lathe
args=sys.argv[sys.argv.index('--')+1:]
OUT=args[0]; FILTER=args[1] if len(args)>1 else ''; POSE=int(args[2]) if len(args)>2 else None
os.makedirs(OUT,exist_ok=True)

def setup():
    M=parts.setup()
    for key,color in {'soil':'8F6543','grass':'86B96E','stem':'3E8750','leaf':'65AE50','tomato':'D94D3E',
                      'cow':'B98860','hoof':'554337','sauce':'754027','sesame':'B77B33','milk':'FFF5DE','cheese':'F1BE42'}.items():
        M[key]=parts.material(key,color)
    M['raw-beef']=parts.meat_material(); M['cooked-beef']=parts.meat_material(True)
    scene=bpy.context.scene
    scene.eevee.taa_render_samples=16
    scene.render.resolution_x=900; scene.render.resolution_y=360
    return M

def ground(M):
    bpy.data.objects['Clay worktop'].data.materials.clear()
    bpy.data.objects['Clay worktop'].data.materials.append(M['grass'])
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Worktop seam'): bpy.data.objects.remove(obj,do_unlink=True)

def fence(M):
    for x in [-3.3,-2.2,-1.1,0,1.1,2.2,3.3]:
        block('Rounded fence post',(x,1.18,.50),(.10,.10,.87),M['cream'],.04)
    for z in [.35,.66]: rod('Fence rail',(-3.3,1.18,z),(3.3,1.18,z),.035,M['cream'])

def cow(M,x=0,y=0,s=1,pose=0):
    def b(name,p,size,mat): return ball(name,(x+p[0]*s,y+p[1]*s,p[2]*s),tuple(v*s for v in size),mat)
    b('Hanwoo body',(0,0,.96),(1.0,.43,.53),M['cow'])
    for xx in [-.61,.54]:
        for yy in [-.26,.26]:
            rod('Cow leg',(x+xx*s,y+yy*s,.76*s),(x+(xx+.025*math.sin(pose+xx))*s,y+yy*s,.23*s),.10*s,M['cow'])
            b('Cloven hoof',(xx,yy,.17),(.13,.13,.09),M['hoof'])
    b('Hanwoo head',(-.90,-.02,1.31),(.38,.33,.43),M['cow'])
    b('Soft muzzle',(-1.13,-.23,1.18),(.29,.22,.19),M['dough'])
    for yy in [-.29,.28]:
        ear=b('Cow ear',(-.86,yy*1.5,1.55),(.24,.12,.085),M['cow']); ear.rotation_euler[1]=.2
        b('Small eye',(-1.11,yy,1.49),(.043,.022,.043),M['dark'])
        rod('Short horn',(x-.80*s,y+yy*s,1.64*s),(x-.75*s,y+yy*1.2*s,1.84*s),.042*s,M['cream'])
    b('Visible near eye',(-.89,-.38,1.43),(.055,.028,.055),M['dark'])
    b('Eye highlight',(-.88,-.406,1.45),(.016,.009,.016),M['cream'])
    for xx in [-1.25,-1.07]: b('Nostril',(xx,-.42,1.22),(.026,.015,.022),M['hoof'])
    rope('Cow tail',[(x+.84*s,y+.1*s,1.15*s),(x+1.10*s,y+.16*s,.90*s),(x+1.15*s,y+.18*s,.62*s)],.032*s,M['cow'])
    b('Tail tuft',(1.15,.18,.58),(.08,.07,.13),M['hoof'])

def barn(M):
    block('Red barn',(-2.45,.56,.76),(1.2,.9,1.3),M['red'],.09)
    for side in [-1,1]:
        roof=block('Pitched barn roof',(-2.45+side*.33,.56,1.53),(.86,1.15,.14),M['cream'],.04)
        roof.rotation_euler[1]=side*.58
    block('Barn door',(-2.45,.078,.58),(.58,.06,.85),M['cream'],.06)
    rod('Barn door seam',(-2.45,.035,.20),(-2.45,.035,.98),.014,M['red'])

def farm(M,pose,growing=False):
    ground(M); fence(M); barn(M)
    size=.52+pose*.17 if growing else .95
    cow(M,.55,-.30,size,pose)
    if not growing: cow(M,2.35,.55,.47,pose)
    block('Feed trough',(-.66,-1.03,.28),(1.5,.47,.30),M['orange'],.07)
    for j in range(8):
        rod('Hay in trough',(-1.30+j*.17,-1.02,.45),(-1.12+j*.17,-.90,.45),.024,M['yellow'])

def basket(M,x,y):
    lathe('Harvest basket',(x,y,.08),[(0,0),(0,.42),(.12,.51),(.48,.61),(.57,.61),(.59,.54),(.46,.50),(.14,.36),(.13,0)],M['orange'],segments=64)
    ring('Basket rim',(x,y,.64),.57,.035,M['crust'])
    for z in [.24,.36,.48]: ring('Woven basket band',(x,y,z),.43+z*.25,.018,M['crust'])

def leaf(M,pos,size,angle=0):
    obj=ball('Clay leaf',pos,(size*.40,size*.72,size*.12),M['leaf']); obj.rotation_euler[2]=angle
    return obj

def stalk(M,x,y,h,sesame=False,pose=0):
    sway=.04*math.sin(pose+x*2)
    rope('Growing stalk',[(x,y,.13),(x+sway,y,h*.55),(x+sway*1.5,y,h)],.025,M['stem'] if sesame else M['orange'])
    if sesame:
        for j in range(3):
            z=h*(.30+j*.19)
            for side in [-1,1]:
                leaf(M,(x+side*.14,y,z),.25,side*.9)
                ball('Sesame pod',(x+side*.09,y,z+.1),(.07,.07,.16),M['grass'],j)
    else:
        for j in range(4):
            for side in [-1,1]:
                grain=ball('Wheat kernel',(x+sway*1.5+side*.085,y,h-.34+j*.10),(.095,.055,.067),M['yellow'],j)
                grain.rotation_euler[1]=side*.55

def field(M,pose,kind='wheat',growing=False):
    ground(M)
    block('Raised soil bed',(-.55,0,.13),(4.7,2.35,.20),M['soil'],.14)
    basket(M,2.55,-.54)
    stage=pose if growing else 2
    harvested=growing and pose==3
    for row in range(2):
      for j in range(6):
        x=-2.5+j*.68; y=-.50+row*.91
        if harvested and j>=3: continue
        if kind in ['wheat','sesame']:
            h=.4+stage*.35 if growing else 1.48
            if growing and stage==0:
                rod('Seedling shoot',(x,y,.2),(x,y,.45),.018,M['stem'])
                for side in [-1,1]: leaf(M,(x+side*.09,y,.35),.18,side*.8)
            else: stalk(M,x,y,h,kind=='sesame',pose)
        elif kind=='tomato':
            h=.35+min(stage,2)*.55
            rod('Tomato vine',(x,y,.23),(x,y,h),.027,M['stem'])
            for k in range(3):
                z=.30+k*h*.22; side=-1 if k%2 else 1
                rod('Fruit branch',(x,y,z),(x+side*.18,y,z+.11),.018,M['stem'])
                leaf(M,(x-side*.12,y,z+.12),.22,.7*side)
                if stage>=1:
                    ball('Ripening tomato',(x+side*.20,y-.03,z),(.17,.17,.16),M['tomato'] if stage>=2 else M['grass'],k)
                    leaf(M,(x+side*.20,y-.03,z+.15),.09,.3)
        elif kind=='lettuce':
            lettuce(M,x,y,.27,.26+min(stage,2)*.13,pose,True)
    if harvested:
        for j in range(5):
            x=2.3+(j%3)*.16; y=-.65+(j//3)*.18
            if kind=='tomato': ball('Picked tomato',(x,y,.68),(.16,.16,.16),M['tomato'],j)
            elif kind=='lettuce': lettuce(M,x,y,.60,.19,pose,True)
            elif kind=='sesame': ball('Harvested sesame',(x,y,.68),(.08,.045,.035),M['cream'],j)
            else:
                rod('Cut wheat',(x,y,.64),(x-.30,y+.20,.75),.028,M['yellow'])
                ball('Harvested grain',(x-.30,y+.20,.75),(.12,.05,.06),M['yellow'],j)

def lettuce(M,x,y,z,r=1,pose=0,whole=False):
    for j in range(9):
        a=j*math.tau/9
        obj=leaf(M,(x+math.cos(a)*r*.42,y+math.sin(a)*r*.42,z+(r*.17 if whole else 0)+.07*math.sin(j*2+pose*.2)),r*.80,a)
        obj.rotation_euler[0]=(.65 if whole else .2)*math.sin(a)
        obj.rotation_euler[1]=(.65 if whole else 0)*math.cos(a)
        if whole: obj.scale.z*=1.8
    ball('Lettuce heart',(x,y,z+(r*.30 if whole else .10)),(r*.48 if whole else r*.36,r*.48 if whole else r*.36,r*.38 if whole else r*.20),M['grass'])

def delivery(M,pose):
    ground(M)
    block('Country to city road',(0,-.45,.13),(7.5,1.75,.18),M['dark'],.08)
    for x in [-3,-2,-1,0,1,2,3]: block('Road dash',(x,-.7,.23),(.5,.055,.02),M['cream'],.01)
    barn(M)
    for i in range(4):
        x=1.25+i*.60; h=1.2+(i%2)*.55
        block('Seoul city building',(x,1.0,h/2+.08),(.48,.57,h),M['blue'],.04)
        for z in [.45,.80,1.15]:
            if z<h: block('Building window',(x,.70,z),(.26,.025,.10),M['cream'],.01)
    block('Burger shop',(2.54,.66,.69),(1.43,.84,1.18),M['cream'],.06)
    block('Shop front window',(2.25,.21,.72),(.53,.045,.65),M['glass'],.035)
    block('Shop entrance',(2.86,.21,.60),(.36,.045,.91),M['teal'],.035)
    for j in range(8):
        canopy=block('Striped shop awning',(1.86+j*.19,.10,1.30),(.19,.64,.11),M['red'] if j%2 else M['cream'],.025)
        canopy.rotation_euler[0]=.16
    x=-1.20+pose*.65
    block('Food truck cargo',(x,-.43,.91),(1.45,.80,1.02),M['cream'],.09)
    block('Truck cab',(x+.98,-.43,.71),(.66,.84,.73),M['teal'],.09)
    block('Truck windshield',(x+1.12,-.869,.91),(.34,.025,.30),M['glass'],.04)
    for xx in [x-.48,x+.90]:
        for yy in [-.89,.04]:
            tire=ball('Truck wheel',(xx,yy,.37),(.23,.09,.23),M['dark'])
            hub=ball('Wheel hub',(xx,yy-.04,.37),(.10,.065,.10),M['silver'])
    # Visible ingredient crate rather than a blank delivery box.
    block('Produce crate',(x,-.43,1.53),(1.15,.62,.25),M['orange'],.04)
    for j in range(3):
        ball('Tomato cargo',(x-.37+j*.35,-.49,1.73),(.16,.16,.16),M['tomato'],j)
        leaf(M,(x-.30+j*.31,-.25,1.72),.23,j)

def cheese(M,pose):
    parts.plate(.65,-.15,M,1.45)
    lathe('Milk pail',(-2.03,.10,.10),[(0,0),(0,.48),(.12,.53),(1.19,.45),(1.24,.40),(1.16,.37),(.18,.40),(.18,0)],M['silver'],segments=80)
    puck('Milk surface',(-2.03,.10,1.17),.38,.018,M['milk'])
    if pose==0:
        puck('Fresh milk',(.65,-.15,.35),1.08,.035,M['milk'])
        rope('Milk pouring',[(-1.65,.1,1.57),(-.79,.0,1.18),(.20,-.10,.40)],.055,M['milk'])
    elif pose==1:
        for j in range(15):
            ball('Milk curd',(.15+(j%5)*.24,-.45+(j//5)*.26,.42),(.17,.15,.10),M['milk'],j)
    else:
        puck('Cheese wheel',(.61,-.12,.35),.92,.41,M['cheese'])
        if pose==3:
            block('Cut cheese slice',(1.63,-.64,.44),(.70,.65,.11),M['cheese'],.025)
    rod('Pail handle',(-2.48,.10,.91),(-2.67,.10,1.50),.026,M['dark'])

def tomato_slice(M,z):
    puck('Thick tomato slice',(0,-.18,z),1.03,.14,M['tomato'])
    puck('Tomato flesh',(0,-.18,z+.14),.87,.018,M['red'])
    for j in range(6):
        a=j*math.tau/6
        ball('Tomato seed chamber',(.56*math.cos(a),-.18+.56*math.sin(a),z+.16),(.20,.11,.018),M['orange'],j)
        for k in range(2): ball('Tomato seed',(.56*math.cos(a)+.05*k,-.18+.56*math.sin(a),z+.18),(.025,.014,.012),M['cream'],k)

def burger(M,layers=6,pose=0,sauce=False,open_top=False):
    parts.plate(0,-.18,M,1.70)
    puck('Bottom bun',(0,-.18,.31),1.18,.28,M['bread'])
    ring('Bottom bun crumb',(0,-.18,.48),1.15,.025,M['crumb'])
    if layers>=2: lettuce(M,0,-.18,.65,1.36,pose)
    if layers>=3: tomato_slice(M,.74)
    if layers>=4:
        cheese_slice=block('Melted cheese',(0,-.18,.99),(2.05,1.90,.095),M['cheese'],.03)
        cheese_slice.rotation_euler[2]=.19
        for x,y in [(-.98,-.78),(.93,.43)]:
            rope('Soft cheese corner',[(x,y,.99),(x*1.01,y,.88)],.045,M['cheese'])
    if layers>=5:
        parts.meat_disk((0,-.18,1.07),1.10,.34,M,True)
        if sauce:
            rope('Bulgogi sauce ribbon',[(-.88,-.50,1.46),(-.55,.12,1.47),(-.18,-.54,1.47),(.20,.15,1.47),(.54,-.53,1.47),(.87,.05,1.47)],.105,M['sauce'])
            for x,y in [(-.65,-1.03),(.56,-1.08)]:
                rope('Thick sauce drip',[(x,y,1.43),(x,y-.04,1.13)],.085,M['sauce'])
    if layers>=6 and not open_top:
        parts.bun(0,-.18,1.45,M,1.04,True)

def assembly(M,pose,step):
    burger(M,step+1,pose)
    # Each shot adds exactly one layer and holds it: no cycling back to a smaller burger.
    if step<5:
        for j in range(3):
            ball('Ingredient crumb',(2.10+j*.26,-.50,.15),(.07,.06,.05),M['cheese'] if step==3 else M['cream'],j)

def finish(M,pose,title=False):
    burger(M,6,pose,True)
    for side in [-1,1]:
        rod('Cafe flag pole',(side*2.24,.40,.12),(side*2.24,.40,1.62),.028,M['orange'])
        flag=block('Cafe pennant',(side*2.02,.40,1.48),(.44,.04,.30),M['teal'] if side<0 else M['red'],.05)
        flag.rotation_euler[1]=.06*math.sin(pose)
    if title:
        ball('Fresh tomato side',(2.55,-.55,.38),(.36,.34,.32),M['tomato'])
        leaf(M,(2.55,-.55,.69),.24,.2)
        stalk(M,-2.62,-.57,.98,False,pose)

def twist(M,pose,sprinkle=False):
    camera=bpy.context.scene.camera
    camera.data.ortho_scale=10.5
    camera.rotation_euler=(Vector((0,0,1.3))-camera.location).to_track_quat('-Z','Y').to_euler()
    burger(M,6 if sprinkle else 5,pose,True,open_top=not sprinkle)
    if not sprinkle:
        x=-.70+pose*.44
        rod('Tilted bulgogi bottle',(x-.90,.19,2.77),(x-.35,.01,2.45),.25,M['sauce'])
        rod('Bottle label band',(x-.74,.14,2.68),(x-.51,.07,2.54),.255,M['cream'])
        rod('Squeeze bottle neck',(x-.35,.01,2.45),(x-.08,-.07,2.25),.15,M['orange'])
        rod('Squeeze nozzle',(x-.08,-.07,2.25),(x+.02,-.11,2.16),.11,M['cream'])
        rope('Visible thick sauce pour',[(x+.02,-.11,2.17),(x+.10,-.22,1.84),(x+.06,-.39,1.47)],.12,M['sauce'])
        ball('Sauce landing pool',(x+.06,-.39,1.48),(.29,.24,.06),M['sauce'],pose)
    else:
        # A tipped jar and a front-facing trail keep the action readable at 320px.
        # Dark golden seeds contrast with the white set; the bun cannot hide them.
        rod('Tipped sesame jar',(1.02,-.55,3.45),(1.75,-.43,3.67),.23,M['teal'])
        rod('Perforated shaker lid',(.90,-.58,3.43),(1.10,-.54,3.49),.245,M['cream'])
        for j in range(3):
            ball('Shaker lid hole',(.878,-.66+j*.07,3.40+j*.035),(.018,.027,.022),M['dark'],j)
        for j in range(12):
            row,col=divmod(j,3)
            x=.78-row*.14+(col-1)*.16+.025*math.sin(pose+j)
            y=-.72-row*.10+(col-1)*.06
            z=3.35-row*.23-pose*.045
            seed=ball('Large falling sesame',(x,y,z),(.11,.065,.055),M['sesame'],j)
            seed.rotation_euler[1]=j*.5+pose*.25

GROUPS=[
    ('title',lambda M,p:finish(M,p,True),2),
    ('origin-farm',lambda M,p:farm(M,p),2),
    ('origin-wheat',lambda M,p:field(M,p,'wheat'),2),
    ('origin-tomato',lambda M,p:field(M,p,'tomato'),2),
    ('origin-lettuce',lambda M,p:field(M,p,'lettuce'),2),
    ('delivery',delivery,4),
    ('grow-cow',lambda M,p:farm(M,p,True),4),
    *[(f'grow-{kind}',lambda M,p,k=kind:field(M,p,k,True),4) for kind in ['wheat','tomato','lettuce','sesame']],
    ('grow-cheese',cheese,4),
    *[(f'stack-{step}',lambda M,p,s=step:assembly(M,p,s),2) for step in range(6)],
    ('sauce-pour',lambda M,p:twist(M,p),4),
    ('sesame-sprinkle',lambda M,p:twist(M,p,True),4),
    ('finished',finish,2),
]

for name,build,count in GROUPS:
    if FILTER and FILTER not in name: continue
    for pose in range(count):
        if POSE is not None and pose!=POSE: continue
        destination=os.path.join(OUT,f'{name}-{pose}.png')
        forced=name in os.environ.get('CLAY_FORCE','').split(',')
        if os.environ.get('CLAY_RESUME') and not forced and os.path.exists(destination):
            with open(destination,'rb') as existing: complete=existing.read()[-8:-4]==b'IEND'
            if complete: continue
        M=setup(); build(M,pose)
        scene=bpy.context.scene; scene.render.filepath=destination
        bpy.ops.render.render(write_still=True)
        # Prevent material/mesh datablocks accumulating through the complete batch.
        bpy.ops.outliner.orphans_purge(do_recursive=True)
