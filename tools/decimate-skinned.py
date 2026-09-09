# Blender headless decimation for the two skinned base character meshes (pass 3, Phase B).
# Unlike tools/decimate.py (static meshes, joins everything into one object), this decimates
# ONLY the largest mesh primitive (the body) and leaves the tiny eyes/eyebrows primitives and
# the 65-joint armature untouched, so the skin binding and joint count survive unchanged.
#   blender -b --python tools/decimate-skinned.py -- <in.glb> <out.glb> <target_body_tris>
import sys
import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
src, dst, target_tris = argv[0], argv[1], float(argv[2])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
body = max(meshes, key=lambda o: len(o.data.polygons))
current_tris = len(body.data.polygons)
ratio = max(0.02, min(1.0, target_tris / current_tris))

for o in bpy.context.scene.objects:
    o.select_set(o is body)
bpy.context.view_layer.objects.active = body

mod = body.modifiers.new("decimate", "DECIMATE")
mod.ratio = ratio
bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
bpy.ops.object.modifier_apply(modifier=mod.name)

# Hard WebGL limit (AGENTS.md): exactly 4 skin weights per vertex. Collapse can otherwise
# leave a blended vertex referencing more than 4 bones; this both caps and renormalizes.
bpy.ops.object.vertex_group_limit_total(limit=4)

print(f"decimate-skinned: {body.name} {current_tris} -> {len(body.data.polygons)} faces (ratio {ratio:.3f})")
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_apply=False, export_yup=True)
