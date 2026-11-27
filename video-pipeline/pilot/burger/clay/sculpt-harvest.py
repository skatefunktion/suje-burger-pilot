"""Render complete, continuously posed clay harvesters, never cut-out body joints.

Blender 3.x: blender -b -t 4 --python sculpt-harvest.py -- OUTPUT [frame ...]
OUTPUT receives 400px transparent poses and projected landmarks. Pixel sizing is
fixed across the shot; anatomy, sleeve surfaces and jacket hems are built in 3D.
"""
import json
import math
from pathlib import Path
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ARGS=sys.argv[sys.argv.index('--')+1:]
LANDMARKS_ONLY='--landmarks-only' in ARGS
ARGS=[arg for arg in ARGS if arg!='--landmarks-only']
OUT=Path(ARGS[0]);OUT.mkdir(parents=True,exist_ok=True)
FRAMES=[int(x) for x in ARGS[1:]] or range(64)
SIZE=400


def material(name,colour):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF')
    def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    bs.inputs['Base Color'].default_value=(*(linear(v) for v in colour),1)
    bs.inputs['Roughness'].default_value=.88
    bs.inputs['Specular'].default_value=.17
    noise=mat.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=190
    bump=mat.node_tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.005
    mat.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
    mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    return mat


bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
SKIN=material('Warm skin clay',(.85,.65,.46))
HAIR=material('Short black hair',(.10,.09,.075))
SHIRTS=[material('Olive work shirt',(.34,.39,.29)),material('Indigo work shirt',(.23,.32,.40))]
PANTS=material('Charcoal work trousers',(.31,.32,.32))
BOOTS=material('Dark rubber boots',(.19,.22,.23))
SOLE=material('Boot soles',(.26,.25,.22))
GLOVE=material('Ivory cotton gloves',(.79,.77,.67))
HAT=material('Beige canvas sun hat',(.65,.62,.49))
BAND=material('Olive hat band',(.34,.35,.28))
EYE=material('Eyes and buttons',(.09,.08,.07))
MOUTH=material('Subtle facial creases',(.43,.26,.17))
LEAF=material('Lettuce clay',(.42,.58,.21))
RED=material('Tomato clay',(.76,.18,.075))


def finish(obj,mat):
    obj.data.materials.append(mat)
    if obj.type=='MESH':
        for face in obj.data.polygons:face.use_smooth=True
    return obj


def ellipsoid(name,center,scale,mat,up=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=center)
    obj=bpy.context.object;obj.name=name;obj.scale=scale
    if up is not None:obj.rotation_euler=Vector(up).to_track_quat('Z','Y').to_euler()
    return finish(obj,mat)


def tube(name,points,radii,mat):
    """One closed, smooth surface across a bent elbow/knee, not ball joints."""
    points=[Vector(p) for p in points];verts=[];faces=[];sides=16
    for i,(point,radius) in enumerate(zip(points,radii)):
        tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
        u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u).normalized()
        for j in range(sides):
            a=j*math.tau/sides
            verts.append(tuple(point+radius*(u*math.cos(a)+v*math.sin(a))))
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple(range(len(verts)-sides,len(verts)))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    finish(obj,mat)
    sub=obj.modifiers.new('Soft continuous garment','SUBSURF');sub.levels=2
    return obj


def chain(a,b,upper,lower,branch=-1):
    """Fixed-length two-bone chain in its anatomical bend plane."""
    a=Vector(a);b=Vector(b);delta=b-a;distance=delta.length;d=delta.normalized()
    assert abs(upper-lower)<distance<upper+lower,(tuple(a),tuple(b),distance)
    along=(upper*upper-lower*lower+distance*distance)/(2*distance)
    across=math.sqrt(max(0,upper*upper-along*along))
    perpendicular=Vector((-d.z,0,d.x)).normalized()
    return a,a+along*d+branch*across*perpendicular,b


def limb(name,joints,radii,mat):
    a,e,b=joints
    return tube(name,[a,a.lerp(e,.25),a.lerp(e,.82),e,e.lerp(b,.18),e.lerp(b,.75),b],
        [radii[0],radii[0],radii[1],radii[1],radii[1],radii[2],radii[2]],mat)


def interp(t,keys):
    for (ta,a),(tb,b) in zip(keys,keys[1:]):
        if t<=tb:
            u=max(0,min(1,(t-ta)/(tb-ta)));u=u*u*(3-2*u)
            return a+(b-a)*u
    return keys[-1][1]


def project(point):
    p=world_to_camera_view(SCENE,SCENE.camera,Vector(point))
    return [round(p.x*SIZE,3),round((1-p.y)*SIZE,3)]


def actor(t,index):
    # Squat through the knees to reach low lettuce; never lengthen the arms.
    bend=interp(t,[(0,12),(18,60 if index==0 else 43),(25,60 if index==0 else 43),
        (35,22),(44,52),(50,52),(60,12),(63,12)])
    hip_z=interp(t,[(0,.94),(18,.53 if index==0 else .72),(25,.53 if index==0 else .72),
        (35,.87),(44,.64),(50,.64),(60,.94),(63,.94)])
    hx=interp(t,[(0,.24),(18,.58 if index==0 else .54),(25,.58 if index==0 else .54),
        (35,.40),(44,.20),(50,.20),(60,.24),(63,.24)])
    hz=interp(t,[(0,.87),(18,.30 if index==0 else .64),(25,.30 if index==0 else .64),
        (35,.97),(44,.47),(50,.47),(60,.87),(63,.87)])
    a=math.radians(bend);up=Vector((math.sin(a),0,math.cos(a)))
    front=Vector((math.cos(a),0,-math.sin(a)))
    hip=Vector((-.08,0,hip_z));collar=hip+up*.43
    shirt=SHIRTS[index]
    # A generous continuous jacket hem overlaps a single solid trouser seat.
    ellipsoid('Solid trouser seat',hip+Vector((0,0,-.075)),(.14,.14,.18),PANTS)
    for side in (-1,1):
        y=side*.085;ankle=Vector((.015+side*.065,y,.145))
        top=hip+Vector((0,y,-.06))
        leg=chain(top,ankle,.39,.37,1)
        limb('Continuous trouser leg',leg,(.079,.071,.056),PANTS)
        ellipsoid('Rubber boot',ankle+Vector((.032,0,-.055)),(.105,.067,.108),BOOTS)
        ellipsoid('Flat boot sole',ankle+Vector((.045,0,-.124)),(.125,.071,.023),SOLE)
    # Elliptical torso rings share one mesh, so bending cannot open a waist cut.
    vertices=[];faces=[];sides=24
    for z,rx,ry in [(-.10,.145,.15),(-.07,.15,.15),(0,.14,.14),(.18,.15,.14),
            (.32,.15,.155),(.39,.105,.14),(.43,.065,.072)]:
        for j in range(sides):
            angle=j*math.tau/sides
            vertices.append(tuple(hip+up*z+front*(rx*math.cos(angle))+Vector((0,ry*math.sin(angle),0))))
    for i in range(6):
        for j in range(sides):
            n=(j+1)%sides;faces.append((i*sides+j,i*sides+n,(i+1)*sides+n,(i+1)*sides+j))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple(range(144,168))])
    mesh=bpy.data.meshes.new('One uninterrupted jacket');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('One uninterrupted jacket',mesh);bpy.context.collection.objects.link(obj);finish(obj,shirt)
    sub=obj.modifiers.new('Soft jacket folds','SUBSURF');sub.levels=2
    # Sleeves are each one surface, of adult length (not detached sprite rods).
    arms=[]
    for side in (1,-1):
        shoulder=hip+up*.33+Vector((.012,side*.14,0))
        wrist=Vector((hx,side*.10,hz))
        joints=chain(shoulder,wrist,.29,.27)
        limb('Continuous bent sleeve',joints,(.062,.052,.036),shirt)
        hand=ellipsoid('Gloved hand',wrist+Vector((.018,0,-.035)),(.041,.038,.064),GLOVE)
        ellipsoid('Glove thumb',wrist+Vector((.048,-.014,-.022)),(.022,.020,.038),GLOVE)
        arms.append([list(p) for p in joints])
    # Head is a restrained adult profile, looking down toward the working hands.
    look=math.radians(12+bend*.35);hu=Vector((math.sin(look),0,math.cos(look)))
    hf=Vector((math.cos(look),0,-math.sin(look)))
    neck=collar+hu*.025
    ellipsoid('Neck inside collar',neck,(.052,.055,.075),SKIN,hu)
    head=neck+hu*.13
    ellipsoid('Face and jaw',head+hf*.030-hu*.024,(.107,.094,.116),SKIN,hu)
    # Hair is a cap/back, not a full dark head overlapping the cheek and eye.
    ellipsoid('Short hair cap',head-hf*.018+hu*.082,(.110,.096,.066),HAIR,hu)
    ellipsoid('Short hair at nape',head-hf*.075+hu*.008,(.044,.088,.075),HAIR,hu)
    ellipsoid('Small profile nose',head+hf*.124-hu*.015,(.035,.044,.031),SKIN,hu)
    ellipsoid('Ear',head-hf*.030+Vector((0,-.105,0)),(.032,.018,.043),SKIN,hu)
    # Place profile details outside the cheek, not buried inside its surface.
    eye=head+hf*.079+hu*.023+Vector((0,-.105,0))
    ellipsoid('Visible eye',eye,(.011,.010,.009),EYE,hu)
    brow=head+hf*.074+hu*.052+Vector((0,-.103,0))
    tube('Short eyebrow',[brow-hf*.017,brow,brow+hf*.017],[.0035]*3,HAIR)
    mouth=head+hf*.078-hu*.061+Vector((0,-.098,0))
    tube('Small mouth crease',[mouth-hf*.012,mouth,mouth+hf*.017],
        [.0025,.003,.0025],MOUTH)
    ellipsoid('Hat crown',head+hu*.150,(.151,.138,.096),HAT,hu)
    ellipsoid('Hat band',head+hu*.122,(.155,.14,.027),BAND,hu)
    ellipsoid('Sun hat brim',head+hu*.102,(.195,.18,.013),HAT,hu)
    # Garment buttons add construction detail without robotic joint hardware.
    for d in (.12,.23,.32):
        ellipsoid('Shirt button',hip+up*d+front*.142+Vector((0,-.015,0)),(.011,.012,.011),EYE)
    # Whole crop follows the actual gloved hand. Never point tomatoes at lettuce.
    crop=Vector((hx+.025,-.105,hz-.085))
    holding=24<=t<49
    return {'feet':project((.015,0,.0)),'hip':project(hip),'shoulder':project(hip+up*.33),
        'head':project(head),'nose':project(head+hf*.124-hu*.015),
        'eye':project(eye),'cheek':project(head+hf*.035-hu*.024+Vector((0,-.105,0))),
        'crop':project(crop),'hands':project((hx,0,hz)),
        'arms':arms,'bend':bend,'hip_z':hip_z,'holding':holding,'deposited':t>=49}


SCENE=bpy.context.scene
SCENE.render.engine='BLENDER_EEVEE';SCENE.eevee.taa_render_samples=24
SCENE.eevee.use_gtao=True;SCENE.eevee.gtao_distance=.18;SCENE.eevee.gtao_factor=1.1
SCENE.render.resolution_x=SIZE;SCENE.render.resolution_y=SIZE
SCENE.render.resolution_percentage=100;SCENE.render.film_transparent=True
SCENE.render.image_settings.file_format='PNG';SCENE.render.image_settings.color_mode='RGBA'
SCENE.view_settings.view_transform='Standard';SCENE.view_settings.look='None'
SCENE.view_settings.exposure=.6;SCENE.view_settings.gamma=1
SCENE.world.color=(.5,.5,.5)
for pos,power,size in [((-3,-4,6),420,4),((4,-1,3),170,3),((0,3,4),260,3),
        ((0,-4,2.4),100,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    light=bpy.context.object;light.data.energy=power;light.data.size=size
    light.rotation_euler=(Vector((0,0,.9))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-6,3.0))
cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.85))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=2.5;SCENE.camera=cam
KEEP=set(bpy.data.objects)
metadata={}
for frame in FRAMES:
    for index in (0,1):
        for obj in list(bpy.data.objects):
            if obj not in KEEP:bpy.data.objects.remove(obj,do_unlink=True)
        metadata[f'{index}-{frame:02d}']=actor(frame,index)
        bpy.context.view_layer.update()
        SCENE.render.filepath=str(OUT/f'worker-{index}-{frame:02d}.png')
        if not LANDMARKS_ONLY:bpy.ops.render.render(write_still=True)
(OUT/'landmarks.json').write_text(json.dumps(metadata,indent=2))
