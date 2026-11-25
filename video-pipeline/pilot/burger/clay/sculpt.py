"""Rebuild the original clay miniature assets. Blender 3.x, Eevee.

blender -b -t 4 --python sculpt.py -- [output-directory] [scene filter] [pose]
No reference image is copied into the artwork. All meshes/materials are procedural.
"""
import bpy, math, os, sys
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
    links.new(noise.outputs['Fac'], bump.inputs['Height']); links.new(bump.outputs['Normal'], bs.inputs['Normal'])
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
        for center in [(-.35,-.84,.42), (.58,-.42,.70), (-.05,.14,.99)]:
            normal = Vector(center).normalized()
            tangent = normal.cross(Vector((0,0,1))).normalized()
            patches.append((normal, tangent, normal.cross(tangent)))
    for v in obj.data.vertices:
        n = v.co.normalized(); x,y,z = n
        irregular = 1 + .040*math.sin(x*6+y*4+seed)*math.cos(z*7-x*3) + .019*math.sin(y*15+z*8+seed)
        if dents:
            for normal, tangent, bitangent in patches:
                if n.dot(normal) < .85: continue
                u, w = n.dot(tangent), n.dot(bitangent)
                radius = math.sqrt((u/.40)**2 + (w/.32)**2)
                if radius < 1:
                    mask = min(1, (1-radius)*4)
                    # Concentric, slightly asymmetric fingertip ridges pressed into dough.
                    whorl = radius + .045*math.sin(math.atan2(w,u)*2)
                    groove = .5 + .5*math.cos(whorl*math.tau*4)
                    irregular -= mask*(.018 + .032*groove)
        v.co *= irregular
    # Refresh normals after sculpting; otherwise grooves keep smooth-sphere shading.
    obj.data.update()
    obj.scale = scale; return finish(obj, mat)

def block(name, pos, scale, mat, bevel=.15):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos); obj=bpy.context.object; obj.name=name
    obj.dimensions = scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod=obj.modifiers.new('Soft hand-shaped corners', 'BEVEL'); mod.width=bevel; mod.segments=5
    return finish(obj, mat)

def rope(name, points, radius, mat):
    curve=bpy.data.curves.new(name, 'CURVE'); curve.dimensions='3D'; curve.resolution_u=12
    curve.bevel_depth=radius; curve.bevel_resolution=4; curve.resolution_u=16
    spline=curve.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for bp, p in zip(spline.bezier_points,points): bp.co=p; bp.handle_left_type=bp.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj); return finish(obj,mat)

def ring(name, pos, radius, thickness, mat, sy=1):
    pts=[(pos[0]+radius*math.cos(i*math.tau/48),pos[1]+radius*math.sin(i*math.tau/48)*sy,pos[2]+.007*math.sin(i*1.7)) for i in range(49)]
    return rope(name,pts,thickness,mat)

def fingerprints(pos, rx, ry, mat):
    x,y,z=pos
    for j in range(4):
        pts=[(x+(rx+j*.026)*math.cos(a),y-.007*j,z+(ry+j*.016)*math.sin(a)) for a in [math.pi*(.18+k*.036) for k in range(17)]]
        rope('Pressed fingerprint ridge',pts,.008,mat)

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
      'print':'D4A44B','brownprint':'70422C','backdrop':'F4F2EB','silver':'C6C9CE'}.items()}
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
    ball('Plate',(x,y,.19),(r,r*.8,.11),M['teal'],14)
    ball('Plate center',(x,y,.25),(r*.87,r*.68,.075),M['cream'],15)

def bun(x,y,z,M,scale=1, baked=True):
    # Separate hand-pressed bottom rim, irregular dome and individually rolled sesame.
    ball('Pressed bun rim',(x,y,z-.14*scale),(1.04*scale,.83*scale,.22*scale),M['orange'] if baked else M['dough'],7)
    ball('Hand-molded bun',(x,y,z+.12*scale),(1.03*scale,.83*scale,.62*scale),M['bread'] if baked else M['dough'],8,True)
    if baked:
      for j,(dx,dy) in enumerate([(-.45,-.32),(.1,-.4),(.52,-.16),(-.5,.2),(0,.15),(.43,.35),(-.12,.48)]):
        zz=z+.10*scale+.62*scale*math.sqrt(max(.1,1-(dx/1.03)**2-(dy/.83)**2))
        seed=ball('Rolled sesame',(x+dx*scale,y+dy*scale,zz),(.11*scale,.043*scale,.033*scale),M['white'],j+1)
        seed.rotation_euler[2]=j*.8
    else:
      fingerprints((x-.17*scale,y-.73*scale,z+.23*scale),.19*scale,.11*scale,M['print'])

def flour_jar(M):
    block('Flour jar',(-2.6,.65,.55),(.74,.7,.96),M['cream'],.18)
    block('Rolled red lid',(-2.6,.65,1.08),(.86,.79,.18),M['red'],.09)
    rope('Wheat stem',[(-2.65,.275,.34),(-2.65,.275,.76)],.024,M['orange'])
    for dx,dz in [(-.07,.48),(.07,.58),(-.07,.67)]: ball('Wheat grain',(-2.65+dx,.26,dz),(.08,.026,.045),M['orange'])

def tools(M):
    pin=ball('Rolling pin',(2.45,-.45,.29),(.32,.87,.24),M['orange'],4); pin.rotation_euler[2]=.4
    rope('Pin handle',[(2.04,-1.35,.29),(2.85,.49,.29)],.09,M['red'])
    ball('Loose flour',(-1.8,-1.1,.13),(.38,.23,.06),M['cream'],15)

def mixing(M,pose):
    flour_jar(M); tools(M)
    ball('Bowl body',(0,0,.53),(1.23,1.0,.60),M['teal'],21)
    ring('Thick rolled bowl rim',(0,0,1.02),1.14,.105,M['teal'],.83)
    ball('Dough in bowl',(0,0,1.00),(1.06,.84,.16),M['dough'],17,True)
    # Successive posed angles, rendered as held stop-motion exposures.
    ang=(pose-1.5)*.15
    rope('Wooden mixing spoon',[(.2+ang,0,1.03),(.40+ang,.13,1.58),(.65+ang,.20,2.22)],.075,M['orange'])
    ball('Spoon end',(.65+ang,.2,2.22),(.10,.09,.15),M['orange'],13)
    ball('Folded dough',(-.28+ang,0,1.13),(.46,.29,.18),M['dough'],6)
    for i in range(3): ball('Dough crumb',(-.7+i*.58,-1.2,.16),(.10,.08,.08),M['dough'],i)

def proof(M,pose):
    flour_jar(M); tools(M); plate(0,0,M,1.48)
    bun(0,0,.65+pose*.035,M,1.06+pose*.045,False)
    # A visible kneaded seam pressed into the rear of the mound.
    rope('Kneaded seam',[(-.7,.3,1.05),(-.3,.55,1.25),(.2,.5,1.32),(.6,.23,1.18)],.035,M['dough'])

def oven(M,pose):
    block('Red clay oven',(1.7,.65,1.13),(2.05,1.6,2.12),M['red'],.26)
    block('Oven opening',(1.7,-.18,1.05),(1.63,.12,1.23),M['dark'],.17)
    block('Oven handle',(1.7,-.32,1.73),(1.22,.18,.13),M['cream'],.06)
    for x in [1.12,2.25]: ball('Oven knob',(x,-.27,2.00),(.1,.07,.1),M['yellow'],3)
    plate(-.8,-.35,M,1.55); bun(-.8,-.35,.69,M,1.20,True)
    for j in range(2):
      rope('Clay heat curl',[(.15+j*.3,.05,1.65),(.10+j*.3,.08,1.88+pose*.025),(.24+j*.3,.1,2.13)],.028,M['cream'])

def board(M):
    block('Cutting board',(0,-.15,.22),(3.7,2.15,.22),M['orange'],.2)
    ball('Board hanging hole',(-1.55,-.86,.344),(.1,.1,.015),M['brownprint'])

def mince(M,pose):
    board(M); flour_jar(M)
    for row in range(6):
      y=-.7+row*.22
      pts=[(-.9+i*.36,y+.045*math.sin(i*2+row),.42+.015*math.sin(i)) for i in range(6)]
      rope('Rolled pink mince',pts,.105,M['pink'])
    knife=block('Chunky toy blade',(.05,-.1,1.02+pose*.08),(1.4,.12,.40),M['silver'],.09)
    knife.rotation_euler[1]=-.12
    handle=block('Red knife handle',(.99,-.10,1.16+pose*.08),(.63,.20,.23),M['red'],.09)
    for i in range(3): ball('Cut dough pieces',(-1.05+i*.46,-1.02,.43),(.16,.13,.12),M['pink'],i+1)

def patty(M,pose,cooked=False):
    mat=M['meat'] if cooked else M['pink']
    lift = .4 if cooked else 0
    ball('Thick patty base',(0,-.2,.56+lift),(1.25,1.02,.27),mat,4,True)
    ball('Hand-pressed patty',(0,-.2,.66+lift),(1.26,1.01,.24),mat,9,True)
    if cooked:
      for j in [-1,0,1]:
        x=j*.55
        rope('Pressed grill groove',[(x-.17,-.85,.79+lift),(x-.06,-.45,.875+lift),(x+.1,.2,.85+lift),(x+.17,.48,.77+lift)],.032,M['brownprint'])
    else:
      fingerprints((-.12,-1.07,.72),.23,.12,M['pink'])

def shaping(M,pose):
    plate(0,-.2,M,1.65); patty(M,pose)
    # Dough tools remain simple clay props; no borrowed characters or logos.
    for side in [-1,1]:
      xx=side*(1.5-pose*.035)
      ball('Palm',(xx,.18,.79),(.42,.52,.28),M['cream'],11)
      for j in range(3): ball('Clay finger',(xx-side*.14,-.22+j*.19,.64),(.26,.10,.14),M['cream'],j)
    ball('Spare pink dough',(-2.7,.65,.39),(.48,.36,.34),M['pink'],25,True)
    block('Teal modeling tool',(2.65,.65,.21),(.21,1.1,.19),M['teal'],.09)

def grill(M,pose):
    block('Toy grill body',(0,0,.32),(3.4,2.4,.48),M['red'],.23)
    block('Grill surface',(0,-.1,.59),(3.13,2.1,.14),M['dark'],.10)
    for x in [-1.2,-.8,-.4,0,.4,.8,1.2]: rope('Thick grill bar',[(x,-1.0,.70),(x,.85,.70)],.055,M['silver'])
    # Steam curls flex between the held claymation exposures.
    patty(M,pose,True)
    for x in [-.7,0,.7]:
      rope('Physical clay steam',[(x,.10,1.35),(x-.13,.12,1.70+pose*.025),(x+.08,.13,1.97+pose*.025)],.035,M['cream'])
    for x in [-1,0,1]: ball('Yellow control',(x,-1.23,.31),(.12,.07,.12),M['yellow'],2)
    block('Spatula handle',(2.35,-.25,.27),(.22,1.55,.18),M['teal'],.08)
    block('Spatula blade',(2.35,.58,.31),(.66,.67,.08),M['silver'],.08)

for label,build in [('bun-mix',mixing),('bun-proof',proof),('bun-bake',oven),('patty-mince',mince),('patty-shape',shaping),('patty-grill',grill)]:
    if FILTER and FILTER not in label: continue
    for pose in range(4):
        if POSE is not None and pose != POSE: continue
        M=setup(); build(M,pose)
        scene=bpy.context.scene; scene.render.filepath=os.path.join(OUT,f'{label}-{pose}.png')
        bpy.ops.render.render(write_still=True)
