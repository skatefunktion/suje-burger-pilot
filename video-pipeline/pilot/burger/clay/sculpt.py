"""Rebuild the original clay miniature assets. Blender 3.x, Eevee.

blender -b -t 4 --python sculpt.py -- [output-directory] [scene filter] [pose]
No reference image is copied into the artwork. All meshes/materials are procedural.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else os.path.join(os.path.dirname(__file__), 'assets')
FILTER = args[1] if len(args) > 1 else ''
POSE = int(args[2]) if len(args) > 2 else None
os.makedirs(OUT, exist_ok=True)

def rgb(hexcode):
    h = hexcode.lstrip('#')
    # sRGB colors into Blender's linear node inputs.
    values = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values)

def material(name, color, rough=.94):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nodes = mat.node_tree.nodes; links = mat.node_tree.links
    bs = nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = (*rgb(color), 1)
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Specular'].default_value = .12
    bs.inputs['Subsurface'].default_value = .015
    noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 105
    noise.inputs['Detail'].default_value = 3; noise.inputs['Roughness'].default_value = .7
    bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .24; bump.inputs['Distance'].default_value = .025
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    broad = nodes.new('ShaderNodeTexNoise'); broad.inputs['Scale'].default_value = 7
    broad.inputs['Detail'].default_value = 2
    kneaded = nodes.new('ShaderNodeBump'); kneaded.inputs['Strength'].default_value = .28; kneaded.inputs['Distance'].default_value = .045
    links.new(broad.outputs['Fac'], kneaded.inputs['Height']); links.new(bump.outputs['Normal'], kneaded.inputs['Normal'])
    links.new(kneaded.outputs['Normal'], bs.inputs['Normal'])
    return mat

def finish(obj, mat):
    obj.data.materials.append(mat)
    if obj.type == 'MESH':
        for face in obj.data.polygons: face.use_smooth = True
    return obj

def ball(name, pos, scale, mat, seed=1, dents=False):
    # Hero pieces carry real pressed fingerprint grooves, not painted marks.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=192 if dents else 56, ring_count=112 if dents else 32, location=pos)
    obj = bpy.context.object; obj.name = name
    patches = []
    if dents:
        for center in [(.35,-.84,.42)]:
            normal = Vector(center).normalized()
            tangent = normal.cross(Vector((0,0,1))).normalized()
            patches.append((normal, tangent, normal.cross(tangent)))
    for v in obj.data.vertices:
        n = v.co.normalized(); x,y,z = n
        irregular = 1 + .018*math.sin(x*6+y*4+seed)*math.cos(z*7-x*3) + .006*math.sin(y*15+z*8+seed)
        if dents:
            for normal, tangent, bitangent in patches:
                if n.dot(normal) < .85: continue
                u, w = n.dot(tangent), n.dot(bitangent)
                radius = math.sqrt((u/.23)**2 + (w/.17)**2)
                if radius < 1:
                    mask = min(1, (1-radius)*4)
                    # Concentric, slightly asymmetric fingertip ridges pressed into dough.
                    whorl = radius + .045*math.sin(math.atan2(w,u)*2)
                    groove = .5 + .5*math.cos(whorl*math.tau*4)
                    irregular -= mask*(.006 + .008*groove)
        v.co *= irregular
    # Refresh normals after sculpting; otherwise grooves keep smooth-sphere shading.
    obj.data.update()
    obj.scale = scale; return finish(obj, mat)

def block(name, pos, scale, mat, bevel=.15):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos); obj=bpy.context.object; obj.name=name
    obj.dimensions = scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod=obj.modifiers.new('Soft hand-shaped corners', 'BEVEL'); mod.width=bevel; mod.segments=5
    return finish(obj, mat)

def fingerprint(u, v, width=.30, height=.22, depth=.035):
    """A pressed asymmetric whorl, resolved in geometry rather than painted rings."""
    u/=width; v/=height; radius=math.hypot(u,v)
    if radius>=1: return 0
    whorl=radius+.035*math.sin(2*math.atan2(v,u))
    mask=min(1,(1-radius)*4)
    return depth*mask*(.55+.45*math.cos(whorl*math.tau*4))

def hand_block(name,pos,scale,mat,bevel=.15):
    """A legible rounded appliance with dense, genuinely thumb-pressed surfaces."""
    count=64; vertices=[]; faces=[]; half=Vector(scale)*.5
    inner=Vector(tuple(max(.001,h-bevel) for h in half))
    for axis in range(3):
      for side in [-1,1]:
        base=len(vertices); other=[n for n in range(3) if n!=axis]
        for j in range(count+1):
          for i in range(count+1):
            p=Vector((0,0,0)); p[axis]=side*half[axis]
            p[other[0]]=(i/count*2-1)*half[other[0]]; p[other[1]]=(j/count*2-1)*half[other[1]]
            core=Vector(tuple(max(-inner[n],min(inner[n],p[n])) for n in range(3)))
            normal=(p-core).normalized(); p=core+normal*bevel
            x,y,z=p
            pressed=.014*math.sin(x*7+y*4+z*3)+.009*math.cos(y*11-z*7)
            if axis==2 and side==1: pressed-=fingerprint(x+.20,y-.03,.34,.26,.045)
            if axis==0 and side==1: pressed-=fingerprint(y+.12,z-.20,.31,.31,.040)
            if axis==1 and side==-1: pressed-=fingerprint(x+.44,z-.69,.22,.16,.028)
            vertices.append(tuple(p+normal*pressed))
        for j in range(count):
          for i in range(count):
            a=base+j*(count+1)+i; faces.append((a,a+1,a+count+2,a+count+1))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces)
    bm=bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free(); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj); obj.location=pos
    return finish(obj,mat)

def rope(name, points, radius, mat):
    curve=bpy.data.curves.new(name, 'CURVE'); curve.dimensions='3D'; curve.resolution_u=12
    curve.bevel_depth=radius; curve.bevel_resolution=4; curve.resolution_u=16
    curve.use_fill_caps=True
    spline=curve.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for bp, p in zip(spline.bezier_points,points): bp.co=p; bp.handle_left_type=bp.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj); return finish(obj,mat)

def ring(name, pos, radius, thickness, mat, sy=1):
    pts=[(pos[0]+radius*math.cos(i*math.tau/48),pos[1]+radius*math.sin(i*math.tau/48)*sy,pos[2]+.007*math.sin(i*1.7)) for i in range(49)]
    return rope(name,pts,thickness,mat)

def lathe(name, pos, profile, mat, scale=(1,1,1), seed=1, hand=.008, stamp=False):
    """Closed, round silhouettes with deliberate sidewalls, rims and flat bases."""
    segments=512 if stamp else 160; vertices=[]; faces=[]
    for z,r in profile:
        for i in range(segments):
            a=math.tau*i/segments
            wobble=1+hand*math.sin(5*a+seed)*math.sin(z*5+.5)+hand*.35*math.cos(11*a+seed)
            rr=r*wobble
            if stamp and r>.65:
                u=(a-math.tau if a>math.pi else a)+1.14
                rr-=fingerprint(u,z-.49,.32,.19,.040)
                rr-=fingerprint(u+.70,z-.73,.25,.12,.027)
            vertices.append((rr*math.cos(a)*scale[0],rr*math.sin(a)*scale[1],z*scale[2]))
    for j in range(len(profile)-1):
        for i in range(segments):
            n=(i+1)%segments; a=j*segments; b=(j+1)*segments
            faces.append((a+i,a+n,b+n,b+i))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj); obj.location=pos
    return finish(obj,mat)

def rod(name, a, b, radius, mat):
    """A capped wooden/metal shaft with softly rounded ends."""
    return rope(name,[a,b],radius,mat)

def puck(name,pos,radius,height,mat,seed=1,stamp=False):
    bevel=min(.12,height*.28); inner=radius-bevel
    profile=[(0,0),(0,inner)]
    profile += [(bevel+bevel*math.sin(a),inner+bevel*math.cos(a)) for a in [-math.pi/2+i*math.pi/24 for i in range(13)]]
    profile += [(height-bevel,radius)]
    profile += [(height-bevel+bevel*math.sin(a),inner+bevel*math.cos(a)) for a in [i*math.pi/24 for i in range(13)]]
    profile += [(height-.008,inner*.7),(height-.014,inner*.35),(height-.014,0)]
    return lathe(name,pos,profile,mat,seed=seed,hand=.008,stamp=stamp)

def setup():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'
    scene.eevee.use_gtao=True; scene.eevee.gtao_distance=3; scene.eevee.gtao_factor=1.25
    scene.eevee.use_soft_shadows=True; scene.eevee.taa_render_samples=64
    scene.render.resolution_x=1200; scene.render.resolution_y=480; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
    scene.view_settings.view_transform='Standard'; scene.view_settings.look='None'
    scene.view_settings.exposure=0; scene.view_settings.gamma=1
    scene.world.color=(.55,.55,.55)
    M={k:material(k,c) for k,c in {
      'yellow':'F7C344','dough':'F5D177','orange':'EAA337','bread':'E6A044',
      'teal':'18BBAE','blue':'368DCC','red':'F0514E','pink':'E66B82','meat':'845239',
      'cream':'F5EEE0','table':'D8B984','white':'FFFBED','dark':'474658','green':'59B94F',
      'print':'D4A44B','brownprint':'57392C','backdrop':'F4F2EB','silver':'C6C9CE',
      'crumb':'F4D496','crust':'BF762E','fat':'EBA8AB','rawdetail':'C44C66','glass':'343D46'}.items()}
    block('Clay worktop', (0,0,-.10),(7.9,3.7,.32),M['table'],.22)
    # Small uneven seams make the tabletop a built miniature rather than a UI rectangle.
    for x in [-2.6,0,2.6]:
      rope('Worktop seam',[(x,-1.72,.07),(x+.025,0,.065),(x-.02,1.72,.07)],.008,M['print'])
    block('Seamless studio floor',(0,0,-.52),(200,200,.1),M['backdrop'],.01)
    for name,pos,power,size in [('Large softbox',(-4,-5,8),950,5),('Fill',(5,-1,5),450,4),('Rim',(1,5,7),600,4)]:
      bpy.ops.object.light_add(type='AREA',location=pos); light=bpy.context.object; light.name=name; light.data.energy=power; light.data.shape='DISK'; light.data.size=size
      light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(4.6,-10.5,6.7)); cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'; cam.data.ortho_scale=8.9; scene.camera=cam
    return M

def plate(x,y,M,r=1.3):
    lathe('Thick plate with rolled rim',(x,y,.08),[(0,0),(0,r*.7),(.04,r*.9),(.12,r),(.20,r),(.23,r*.97),(.19,r*.9),(.12,r*.76),(.12,0)],M['teal'],hand=.004)
    puck('Cream plate well',(x,y,.19),r*.77,.045,M['cream'])

def bun(x,y,z,M,scale=1, baked=True):
    # One continuous dome: a stable flat base, narrow crumb band and rounded shoulder.
    profile=[(0,0),(0,.90),(.04,1.04),(.12,1.11),(.21,1.12)]
    profile += [(.21+.67*math.cos(a),1.12*math.sin(a)) for a in [math.pi/2-i*math.pi/384 for i in range(193)]]
    obj=lathe('Round bun dome',(x,y,z),profile,M['bread'] if baked else M['dough'],(scale,scale,scale),seed=8,hand=.018,stamp=True)
    if baked:
      obj.data.materials.append(M['crumb']); obj.data.materials.append(M['crust'])
      for polygon in obj.data.polygons:
        row=polygon.index//512
        if row<2: polygon.material_index=1
        elif row==2: polygon.material_index=2
      for j in range(19):
        a=j*2.39996; rr=.86*math.sqrt((j+.5)/19)
        dx,dy=rr*math.cos(a),rr*math.sin(a)
        zz=z+scale*(.21+.67*math.sqrt(1-(rr/1.12)**2))+.020
        seed=ball('Individual sesame',(x+dx*scale,y+dy*scale,zz),(.086*scale,.035*scale,.023*scale),M['white'],j+1)
        normal=Vector((dx/1.12**2,dy/1.12**2,math.sqrt(1-(rr/1.12)**2)/.67))
        seed.rotation_euler=normal.to_track_quat('Z','Y').to_euler(); seed.rotation_euler.rotate_axis('Z',j*.73)
      ring('Bun lower crease',(x,y,z+.115*scale),1.108*scale,.009*scale,M['crust'])

def flour_jar(M):
    lathe('Flour canister',(-2.7,.65,.09),[(0,0),(0,.32),(.06,.40),(.86,.40),(.94,.34),(.99,.34),(.99,0)],M['cream'])
    puck('Red screw lid',(-2.7,.65,1.06),.44,.14,M['red'])
    ring('Lid seam',(-2.7,.65,1.10),.441,.012,M['crust'])
    block('Flour label',(-2.7,.245,.65),(.46,.035,.53),M['white'],.045)
    rope('Wheat stem',[(-2.7,.215,.43),(-2.7,.215,.84)],.018,M['orange'])
    for j in range(3):
      for side in [-1,1]:
        grain=ball('Wheat label grain',(-2.7+side*.066,.207,.52+j*.10),(.062,.022,.035),M['orange'],j)
        grain.rotation_euler[1]=side*.45

def tools(M):
    # Roller and handles share one axis, rather than a rod crossing an oval blob.
    rod('Rolling pin barrel',(2.35,-.72,.34),(2.35,.44,.34),.23,M['orange'])
    rod('Rolling pin front handle',(2.35,-1.05,.34),(2.35,-.72,.34),.09,M['red'])
    rod('Rolling pin back handle',(2.35,.44,.34),(2.35,.77,.34),.09,M['red'])
    ball('Loose flour',(-1.8,-1.1,.12),(.30,.20,.035),M['cream'],15)
    for j in range(8): ball('Flour grain',(-1.6+.08*math.sin(j*4),-.95+.07*j,.11),(.018,.016,.012),M['cream'],j)

def mixing(M,pose):
    flour_jar(M); tools(M)
    lathe('Open mixing bowl',(0,0,.09),[(0,0),(0,.40),(.12,.65),(.48,.94),(.91,1.10),(1.02,1.11),(1.06,1.06),(.96,1.01),(.52,.87),(.22,.48),(.20,0)],M['teal'],hand=.005)
    ring('Rolled bowl lip',(0,0,1.12),1.075,.045,M['teal'])
    ball('Dough mound',(0,-.04,.83),(.85,.72,.33),M['dough'],17,True)
    ang=(pose-1.5)*.15
    rope('Folded dough ridge',[(-.61,-.15,.99),(-.40,-.36,1.10),(.01,-.25,1.13),(.31,-.12,1.04)],.065,M['dough'])
    rod('Wooden spoon handle',(.22+ang,.05,1.0),(.64+ang,.19,2.10),.048,M['orange'])
    spoon=ball('Oval spoon paddle',(.24+ang,-.01,1.05),(.16,.055,.27),M['orange'],6); spoon.rotation_euler[1]=-.30
    ball('Rounded handle tip',(.64+ang,.19,2.10),(.052,.052,.06),M['orange'])
    for i in range(3): ball('Dough crumb',(-.7+i*.58,-1.2,.16),(.10,.08,.08),M['dough'],i)

def proof(M,pose):
    flour_jar(M); tools(M); plate(0,0,M,1.48)
    bun(0,0,.24,M,.92+pose*.035,False)
    # A restrained flour dusting gives the dough a readable surface without melting its outline.
    for j in range(7):
      a=j*2.4; rr=.55*math.sqrt((j+1)/7)
      ball('Flour on proofing dough',(rr*math.cos(a),rr*math.sin(a),.24+(.92+pose*.035)*(.21+.67*math.sqrt(1-(rr/1.12)**2))),(.025,.020,.007),M['cream'],j)

def oven(M,pose):
    hand_block('Red clay oven',(1.85,.57,1.15),(2.0,1.52,1.93),M['red'],.16)
    for xx in [1.13,2.57]: block('Oven feet',(xx,.22,.15),(.26,.82,.16),M['dark'],.05)
    block('Oven door surround',(1.85,-.225,1.05),(1.70,.12,1.29),M['cream'],.11)
    block('Dark glass window',(1.85,-.301,1.01),(1.43,.055,.97),M['glass'],.10)
    # Visible miniature rack and tray, kept graphic rather than photorealistic glass.
    for zz in [.71,.94]: rod('Oven rack',(1.24,-.34,zz),(2.47,-.34,zz),.014,M['silver'])
    for xx in [1.38,1.70,2.02,2.34]: rod('Rack divider',(xx,-.344,.70),(xx,-.344,.94),.010,M['silver'])
    block('Oven handle',(1.85,-.43,1.58),(1.24,.16,.10),M['dark'],.045)
    for xx in [1.30,2.40]: block('Handle mount',(xx,-.35,1.58),(.10,.14,.10),M['silver'],.03)
    for x in [1.22,2.45]:
      dial=ball('Control dial',(x,-.245,1.92),(.105,.065,.105),M['yellow'])
      rod('Dial pointer',(x,-.312,1.92),(x+.03,-.312,1.99),.012,M['cream'])
    for xx in [1.64,1.78,1.92,2.06]: block('Oven vent',(xx,-.212,1.93),(.06,.025,.028),M['dark'],.008)
    plate(-.82,-.35,M,1.50); bun(-.82,-.35,.24,M,1.15,True)
    for j in range(2):
      rope('Clay heat curl',[(-1.04+j*.37,.05,1.42),(-1.13+j*.37,.06,1.59+pose*.02),(-1.02+j*.37,.08,1.76)],.020,M['cream'])

def board(M):
    block('Cutting board',(0,-.15,.19),(3.65,2.22,.20),M['orange'],.11)
    block('Board handle',(-2.03,-.15,.19),(.60,.59,.18),M['orange'],.12)
    ring('Board hanging hole',(-2.09,-.15,.288),.095,.024,M['crust'])
    for j in range(5):
      xx=-1.45+j*.67
      rope('Cutting board grain',[(xx,-1.04,.294),(xx+.04,-.15,.294),(xx-.02,.73,.294)],.005,M['print'])

def mince(M,pose):
    board(M); flour_jar(M)
    for row in range(5):
      yy=-.27+row*.19
      rope('Capped clay mince',[(-.94+i*.23,yy+.022*math.sin(i*2+row),.39) for i in range(5)],.082,M['pink'])
    for j in range(22):
      xx=.45+(j%5)*.18+.02*math.sin(j*6); yy=-.75+(j//5)*.20
      chunk=block('Diced mince',(xx,yy,.38+(j%3)*.014),(.16,.14,.14),M['pink'] if j%4 else M['fat'],.047)
      chunk.rotation_euler[2]=.3*math.sin(j*7)
    # Blade, bolster and riveted handle are visibly one connected kitchen knife.
    lift=pose*.055
    block('Knife blade',(-.45,.07,.88+lift),(1.43,.075,.37),M['silver'],.045)
    rod('Knife spine',(-1.12,.07,1.065+lift),(.25,.07,1.065+lift),.019,M['cream'])
    block('Knife bolster',(.29,.07,1.01+lift),(.12,.13,.20),M['dark'],.03)
    block('Knife handle',(.68,.07,1.04+lift),(.72,.17,.20),M['red'],.06)
    for xx in [.48,.84]: ball('Handle rivet',(xx,-.019,1.04+lift),(.026,.012,.026),M['silver'])

def patty(M,pose,cooked=False):
    mat=M['meat'] if cooked else M['pink']
    base=.80 if cooked else .295
    radius=1.04 if cooked else 1.12; height=.40 if cooked else .43
    puck('Single thick patty',(0,-.18,base),radius,height,mat,seed=9)
    for j in range(29):
      a=j*2.39996; rr=radius*.88*math.sqrt((j+.5)/29)
      xx,yy=rr*math.cos(a),-.18+rr*math.sin(a)
      col=M['brownprint'] if cooked and j%3 else M['crust'] if cooked else M['rawdetail'] if j%3 else M['fat']
      ball('Pressed clay meat fleck',(xx,yy,base+height-.009),(.030+.012*(j%2),.023,.010),col,j)
    if cooked:
      for xx in [-.58,-.20,.20,.58]:
        span=math.sqrt(max(.1,(radius*.86)**2-xx**2))
        rope('Dark sear mark',[(xx-.10,-.18-span,base+height-.005),(xx,-.18,base+height+.003),(xx+.10,-.18+span,base+height-.005)],.025,M['brownprint'])
    # Tiny pressed sidewall marks preserve the clay feel without a ragged double layer.
    for j in range(12):
      a=-math.pi*.90+j*math.pi*.067
      xx,yy=(radius+.001)*math.cos(a),-.18+(radius+.001)*math.sin(a)
      ball('Hand-pressed edge grain',(xx,yy,base+.17),(.026,.019,.035),mat,j)

def shaping(M,pose):
    board(M); patty(M,pose)
    ball('Spare pink dough',(-2.64,.66,.42),(.40,.36,.33),M['pink'],25,True)
    # Recognizable patty mold and wooden press replace the ambiguous floating mittens.
    lathe('Patty mold',(2.46,.52,.09),[(0,.47),(0,.60),(.32,.60),(.35,.57),(.32,.51),(0,.47)],M['silver'],hand=.003)
    puck('Wooden burger press',(2.43,-.64,.11+pose*.025),.53,.13,M['orange'])
    rod('Press handle',(2.43,-.64,.24+pose*.025),(2.43,-.64,.62+pose*.025),.10,M['teal'])
    ball('Press handle grip',(2.43,-.64,.63+pose*.025),(.22,.12,.09),M['teal'])

def grill(M,pose):
    for xx in [-1.25,1.25]: block('Grill foot',(xx,0,.16),(.34,1.62,.18),M['dark'],.05)
    block('Toy grill body',(0,0,.39),(3.4,2.4,.48),M['red'],.16)
    block('Recessed grill tray',(0,-.08,.67),(3.13,2.10,.14),M['dark'],.10)
    for x in [-1.25,-.94,-.63,-.32,0,.32,.63,.94,1.25]: rod('Capped grill bar',(x,-1.02,.76),(x,.88,.76),.037,M['silver'])
    patty(M,pose,True)
    for x in [-.55,.05,.6]:
      rope('Physical clay steam',[(x,.04,1.25),(x-.08,.06,1.48+pose*.02),(x+.04,.08,1.68+pose*.02)],.020,M['cream'])
    for x in [-.95,.95]:
      ball('Grill temperature dial',(x,-1.225,.40),(.105,.055,.105),M['yellow'])
      rod('Temperature pointer',(x,-1.283,.40),(x+.03,-1.283,.47),.012,M['cream'])
    ball('Heating indicator',(0,-1.232,.42),(.045,.018,.045),M['orange'])
    # A slotted turner, with its metal neck attached to a shaped handle.
    block('Spatula grip',(2.47,-.58,.19),(.22,.95,.15),M['teal'],.07)
    block('Spatula neck',(2.47,.03,.22),(.11,.36,.07),M['silver'],.025)
    block('Spatula head',(2.47,.51,.25),(.66,.65,.065),M['silver'],.055)
    for xx in [2.30,2.47,2.64]: block('Turner slot',(xx,.51,.286),(.055,.35,.008),M['dark'],.018)

for label,build in [('bun-mix',mixing),('bun-proof',proof),('bun-bake',oven),('patty-mince',mince),('patty-shape',shaping),('patty-grill',grill)]:
    if FILTER and FILTER not in label: continue
    for pose in range(4):
        if POSE is not None and pose != POSE: continue
        M=setup(); build(M,pose)
        scene=bpy.context.scene; scene.render.filepath=os.path.join(OUT,f'{label}-{pose}.png')
        bpy.ops.render.render(write_still=True)
