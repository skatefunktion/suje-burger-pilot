"""Sculpt the fixed Korean terrain from public-domain Natural Earth polygons.

blender -b -t 4 --python sculpt-korea-map.py -- /path/to/korea-terrain.png
The same sculpt supplies every night/day frame; no regenerated geography.
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
import sys
from mathutils import Vector

HERE = Path(__file__).resolve().parent
GEO = json.loads((HERE/'korea-map-geography.json').read_text())


def xy(lon, lat):
    return ((lon-126.8)*math.cos(math.radians(36))*1.5, (lat-36)*1.5-1)


def material(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = .94
    bs.inputs['Specular'].default_value = .12
    noise = m.node_tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 130
    bump = m.node_tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .2
    bump.inputs['Distance'].default_value = .015
    m.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    m.node_tree.links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    return m


bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
land = material('Matte meadow clay', (.29, .47, .17))
mountain = material('Soft mountain clay', (.23, .37, .13))
for index, polygon in enumerate(GEO['geometry']['coordinates']):
    pts = [xy(*p) for p in polygon[0][:-1]]
    count = len(pts)
    verts = [(x,y,z) for z in (0,.19) for x,y in pts]
    faces = [tuple(range(count-1,-1,-1)), tuple(range(count,2*count))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh = bpy.data.meshes.new('Natural Earth coastline')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts)>4])
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(f'Korea island {index}',mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(land)
    bevel = obj.modifiers.new('Rounded clay coastline','BEVEL')
    bevel.width = .045
    bevel.segments = 4

# Stylized Taebaek/Sobaek relief, not measured elevation. Connected angular
# crest-and-slope meshes read as mountain ranges, not isolated oval shrubs.
ridge_light=material('Lit clay ridge',(.39,.45,.26))
ridge_shade=material('Clay ridge shadow',(.24,.33,.16))


def mountain_range(name,coordinates,width=.14,height=.27):
    points=[Vector((*xy(*p),0)) for p in coordinates]
    verts=[]
    for i,p in enumerate(points):
        direction=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
        normal=Vector((-direction.y,direction.x,0))
        taper=.14 if i in (0,len(points)-1) else 1
        span=width*(1+.15*math.sin(i*2.3))*taper
        crest=p+normal*(.025*math.sin(i*2.5))
        for v in (p-normal*span,crest,p+normal*span):verts.append(tuple(v))
        verts[-3]=(verts[-3][0],verts[-3][1],.195)
        verts[-2]=(verts[-2][0],verts[-2][1],.195+height*taper*(.8+.2*math.cos(i*2.1)))
        verts[-1]=(verts[-1][0],verts[-1][1],.195)
    faces=[]
    for i in range(len(points)-1):
        a=i*3;b=a+3
        faces.extend([(a,b,b+1,a+1),(a+1,b+1,b+2,a+2)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(ridge_light);obj.data.materials.append(ridge_shade)
    for i,face in enumerate(obj.data.polygons):face.material_index=i%2
    bevel=obj.modifiers.new('Soft clay creases, not oval mounds','BEVEL')
    bevel.width=.012;bevel.segments=2


mountain_range('Taebaek connected crest',[(128.30,38.45),(128.46,38.17),
    (128.62,37.92),(128.67,37.67),(128.82,37.43),(128.90,37.17),
    (128.94,36.90),(129.02,36.62)],.13,.27)
mountain_range('Sobaek connected crest',[(128.82,37.43),(128.50,37.08),
    (128.30,36.90),(128.13,36.63),(127.98,36.40),(127.74,36.10),
    (127.62,35.80),(127.63,35.50),(127.72,35.31)],.13,.24)
for i,branch in enumerate([
    [(128.46,38.17),(128.18,38.12),(127.96,37.95)],
    [(128.67,37.67),(128.39,37.61),(128.18,37.42)],
    [(128.90,37.17),(129.09,37.05),(129.17,36.86)],
    [(128.13,36.63),(128.40,36.57),(128.56,36.37)],
    [(127.74,36.10),(127.45,35.98),(127.31,35.76)],
]):mountain_range(f'Connected spur {i}',branch,.075,.18)

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.eevee.use_gtao=True
scene.eevee.gtao_distance=1
scene.eevee.gtao_factor=1.3
scene.eevee.taa_render_samples=96
scene.render.resolution_x=1080
scene.render.resolution_y=1080
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.world.color=(.5,.5,.5)
for pos,energy,size in [((-4,5,9),950,6),((4,-2,7),350,5)]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    lamp=bpy.context.object
    lamp.data.energy=energy
    lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,0))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,0,15))
camera=bpy.context.object
camera.data.type='ORTHO'
camera.data.ortho_scale=10.8
camera.rotation_euler=(0,0,0)
scene.camera=camera
scene.render.filepath=sys.argv[sys.argv.index('--')+1]
bpy.ops.render.render(write_still=True)
