"""Run with Blender --background MASTER.blend --python this.py -- [preview].
Preserves the approved scene's geometry, materials, lights and color management.
"""
import bpy, math, pathlib, sys
from mathutils import Vector

project=pathlib.Path(__file__).resolve().parents[1]
output=project.parent/'gt3_reference'/'sequence-clockwise-drl-renders'
output.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes['GT3 • Reference finish']
bpy.context.window.scene=scene
camera=bpy.data.objects.new('Web sequence camera',bpy.data.cameras.new('Web sequence camera'))
scene.collection.objects.link(camera)
camera.data.type='PERSP';camera.data.lens=48
scene.camera=camera
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.use_persistent_data=True
cars=set(bpy.data.collections['GT3 • Car'].all_objects)|set(bpy.data.collections['Headlamps • LED optical elements'].all_objects)
for obj in scene.objects:
    if obj.type in ['MESH','CURVE','FONT'] and obj not in cars:obj.hide_render=True
led=bpy.data.materials['Headlamp | cool white LED microprisms']
led.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=22
indices=[0,36,72] if 'preview' in sys.argv else range(73)
for index in indices:
    path=output/f'turn-{index:03}.png'
    if path.exists():continue
    angle=math.radians(140)*index/72
    camera.location=(6.8*math.sin(angle),-6.8*math.cos(angle),1.5)
    camera.rotation_euler=(Vector((0,0,.6))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)
    print(f'SEQUENCE_FRAME {index}/72',flush=True)
