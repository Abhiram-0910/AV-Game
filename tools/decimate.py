# Blender headless decimation for static environment meshes. Called by build-assets.mjs:
#   blender -b --python tools/decimate.py -- <in.glb> <out.glb> <ratio>
# Joins every mesh into one object (single material on the palace), collapses to the ratio,
# and re-exports as GLB. Never used on skinned meshes — that is a pass-3 decision.
import sys
import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
src, dst, ratio = argv[0], argv[1], float(argv[2])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in bpy.context.scene.objects:
    o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
joined = bpy.context.view_layer.objects.active
mod = joined.modifiers.new("decimate", "DECIMATE")
mod.ratio = ratio
bpy.ops.object.modifier_apply(modifier=mod.name)
print(f"decimate: {len(joined.data.polygons)} faces at ratio {ratio}")
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_apply=True, export_yup=True)
