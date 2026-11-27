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

# Stylized eastern relief, not an elevation dataset. Terrain stays fixed.
for i,(lon,lat) in enumerate([(128.5,38.1),(128.55,37.8),(128.6,37.5),
        (128.7,37.1),(128.8,36.7),(128.7,36.25),(128.15,35.8),(127.75,35.5)]):
    x,y = xy(lon,lat)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=(x,y,.16))
    obj=bpy.context.object
    obj.name='Rounded eastern mountain'
    obj.scale=(.16,.26,.13)
    obj.data.materials.append(mountain)
    for face in obj.data.polygons: face.use_smooth=True

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
