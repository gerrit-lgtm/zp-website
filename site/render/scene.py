# Builds the ZeroPoint render scene in Blender and renders frames of the camera move.
#
# Run headless:
#   blender -b -P render/scene.py -- --frames 1 --out render/test --width 2560 --samples 128
#
# Why this exists: the browser cannot render the suit to the quality the client's reference
# images set, and it never will — real-time WebGL has a hard ceiling. Cycles does not. So
# the camera move is rendered here as an image sequence and the site plays it back on
# scroll, which is what the Bloom reference does with video and what the previous ZeroPoint
# site did with a 489-frame sequence.
#
# Coordinate note. The site's camera path (js/rig.js) is in glTF space: +X is the direction
# the figure faces, +Y is up, +Z is the figure's screen-left. Blender's glTF importer maps
# glTF (x, y, z) -> Blender (x, -z, y), so the same conversion is applied to every camera
# and light position here. That keeps one source of truth for the move.

import bpy, sys, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default):
    return argv[argv.index(name) + 1] if name in argv else default


FRAMES = int(arg("--frames", 1))
OUT = arg("--out", "render/test")
WIDTH = int(arg("--width", 2560))
SAMPLES = int(arg("--samples", 128))
ONLY_P = arg("--at", None)          # render a single point on the path, 0..1

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIG = os.path.join(ROOT, "..", "test", "armored_suit.glb")
LOGO = os.path.join(ROOT, "..", "test", "zp_logo_3d.glb")
TEX = {k: os.path.join(HERE, v) for k, v in
       {"base": "basecolor.png", "glow": "glow.png", "orm": "orm.png"}.items()}

GROUND_Y = -0.9245                  # figure's feet, in glTF space
CHEST_DISC = (0.1706, 0.4616, 0.0)  # measured by tools/disc.mjs
DISC_SIZE = 0.1288
FOV_V = 30.0                        # vertical, matching the site camera

# The site's path, verbatim from js/rig.js.
PATH = [
    (0.00, (0.0, 0.620, 0.0), 1.00, -12.0, 3.0),
    (0.22, (0.0, 0.500, 0.0), 1.20, -15.0, 3.0),
    (0.50, (0.0, 0.4616, 0.0), 0.80, -3.0, 1.0),
    (0.74, (0.0, 0.350, 0.0), 1.30, 16.0, 4.0),
    (1.00, (0.0, 0.550, 0.0), 1.10, -7.0, 3.0),
]


def to_blender(p):
    """glTF (x, y, z) -> Blender (x, -z, y)."""
    return Vector((p[0], -p[2], p[1]))


def smootherstep(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def sample_path(p):
    t = min(1.0, max(0.0, p))
    i = 0
    while i < len(PATH) - 2 and t >= PATH[i + 1][0]:
        i += 1
    a, b = PATH[i], PATH[i + 1]
    k = smootherstep(min(1.0, max(0.0, (t - a[0]) / (b[0] - a[0]))))
    lerp = lambda x, y: x + (y - x) * k
    return (
        tuple(lerp(a[1][j], b[1][j]) for j in range(3)),
        lerp(a[2], b[2]),
        math.radians(lerp(a[3], b[3])),
        math.radians(lerp(a[4], b[4])),
    )


def activation(p):
    """0 = dormant, 1 = fully powered. He wakes over the first sixth of the scroll."""
    t = min(1.0, max(0.0, (p - 0.02) / 0.14))
    return t * t * (3 - 2 * t)          # smoothstep


def place(p, aspect):
    """Same framing maths as rig.js place(): frame is a world-space height."""
    target, frame, az, el = sample_path(p)
    dist = (frame / 2) / math.tan(math.radians(FOV_V) / 2)
    ce = math.cos(el)
    pos = (
        target[0] + ce * math.cos(az) * dist,
        target[1] + math.sin(el) * dist,
        target[2] + ce * math.sin(az) * dist,
    )
    return target, pos


# --------------------------------------------------------------------- scene

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "GPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transmission_bounces = 4
scene.cycles.caustics_reflective = False
scene.render.film_transparent = False
scene.render.resolution_x = WIDTH
scene.render.resolution_y = int(WIDTH * 9 / 16)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.compression = 15
scene.view_settings.view_transform = "AgX"      # filmic highlight rolloff
scene.view_settings.look = "AgX - Punchy"
scene.view_settings.exposure = -0.75

# Metal GPU
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
except Exception as e:
    print("[zp] GPU setup note:", e)

bpy.ops.import_scene.gltf(filepath=os.path.normpath(FIG))
figure = next(o for o in bpy.context.selected_objects if o.type == "MESH")
figure.name = "ZP_Figure"

bpy.ops.import_scene.gltf(filepath=os.path.normpath(LOGO))
logo_objs = [o for o in bpy.context.selected_objects if o.type == "MESH"]

# ------------------------------------------------------------------ material

def image(path, non_color=False):
    img = bpy.data.images.load(path, check_existing=True)
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    return img


mat = bpy.data.materials.new("ZP_Suit")
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()

out = nt.nodes.new("ShaderNodeOutputMaterial")
bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

tex_base = nt.nodes.new("ShaderNodeTexImage")
tex_base.image = image(TEX["base"])
nt.links.new(tex_base.outputs["Color"], bsdf.inputs["Base Color"])

# ORM: R occlusion, G roughness, B metalness — the same packing the web build uses.
tex_orm = nt.nodes.new("ShaderNodeTexImage")
tex_orm.image = image(TEX["orm"], non_color=True)
split = nt.nodes.new("ShaderNodeSeparateColor")
nt.links.new(tex_orm.outputs["Color"], split.inputs["Color"])
nt.links.new(split.outputs["Green"], bsdf.inputs["Roughness"])
nt.links.new(split.outputs["Blue"], bsdf.inputs["Metallic"])

# The blue tracery lights itself. In Cycles this also throws light into the scene, which
# is most of what sells it as a real object rather than a lit shell.
tex_glow = nt.nodes.new("ShaderNodeTexImage")
tex_glow.image = image(TEX["glow"])
glow_mul = nt.nodes.new("ShaderNodeVectorMath")
glow_mul.operation = "SCALE"
glow_mul.inputs["Scale"].default_value = 26.0
nt.links.new(tex_glow.outputs["Color"], glow_mul.inputs[0])
nt.links.new(glow_mul.outputs["Vector"], bsdf.inputs["Emission Color"])
bsdf.inputs["Emission Strength"].default_value = 1.0

# A clear coat is what gives moulded armour its wet highlight.
if "Coat Weight" in bsdf.inputs:
    bsdf.inputs["Coat Weight"].default_value = 0.35
    bsdf.inputs["Coat Roughness"].default_value = 0.12

ZP_GLOW_SCALE = glow_mul.inputs["Scale"]
figure.data.materials.clear()
figure.data.materials.append(mat)

# ---------------------------------------------------------------- chest mark

# The mark is authored lying flat and 0.1256 across; the disc is 0.1288. Fit it 1:1 and
# stand it up on the chest plate, which faces +X in glTF space.
ZP_OPTIC = []
fit = (DISC_SIZE * 0.98) / 0.1256
for o in logo_objs:
    o.rotation_euler = (0, 0, 0)
for o in logo_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = logo_objs[0]
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
pivot = bpy.context.object
pivot.name = "ZP_MarkPivot"
for o in logo_objs:
    o.parent = pivot
pivot.scale = (fit, fit, fit)
# The mark is authored lying flat, so its face normal is +Z after the importer's axis
# conversion. R_y(theta) maps (0,0,1) -> (sin theta, 0, cos theta): +90 points the face out
# of the chest along +X. -90 pointed it INTO the chest, which is why the mark read as a
# mirrored blob rather than the vortex.
pivot.rotation_euler = (0, math.radians(90), 0)
pivot.location = to_blender((CHEST_DISC[0] - 0.004, CHEST_DISC[1], CHEST_DISC[2]))

for o in logo_objs:
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        p = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not p:
            continue
        if "optic" in (m.name or "").lower():
            p.inputs["Emission Color"].default_value = (0.16, 0.38, 0.95, 1)
            p.inputs["Emission Strength"].default_value = 0.0
            p.inputs["Roughness"].default_value = 0.1
            ZP_OPTIC.append(p.inputs["Emission Strength"])
        else:
            p.inputs["Metallic"].default_value = 0.85
            p.inputs["Roughness"].default_value = 0.22

# ---------------------------------------------------------------------- set

# Floor: a real glossy surface, so Cycles gives us the reflection instead of a faked one.
bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, GROUND_Y))
floor = bpy.context.object
floor.name = "ZP_Floor"
fm = bpy.data.materials.new("ZP_FloorMat")
fm.use_nodes = True
fb = fm.node_tree.nodes["Principled BSDF"]
fb.inputs["Base Color"].default_value = (0.008, 0.011, 0.017, 1)
fb.inputs["Roughness"].default_value = 0.40
fb.inputs["Metallic"].default_value = 0.18

fnt = fm.node_tree
fcoord = fnt.nodes.new("ShaderNodeTexCoord")
fmap = fnt.nodes.new("ShaderNodeMapping")
fmap.inputs["Scale"].default_value = (0.30, 0.30, 0.30)
fgrad = fnt.nodes.new("ShaderNodeTexGradient")
fgrad.gradient_type = "SPHERICAL"
framp = fnt.nodes.new("ShaderNodeValToRGB")
framp.color_ramp.elements[0].position = 0.42
framp.color_ramp.elements[0].color = (0, 0, 0, 1)
framp.color_ramp.elements[1].position = 0.86
framp.color_ramp.elements[1].color = (1, 1, 1, 1)
fnt.links.new(fcoord.outputs["Object"], fmap.inputs["Vector"])
fnt.links.new(fmap.outputs["Vector"], fgrad.inputs["Vector"])
fnt.links.new(fgrad.outputs["Color"], framp.inputs["Fac"])
fnt.links.new(framp.outputs["Color"], fb.inputs["Alpha"])
floor.data.materials.append(fm)

# World: a real captured studio (Poly Haven ferndale_studio_02, CC0 — see hdri/CREDIT.txt).
# Visible to reflections and lighting, invisible to the camera, so the suit gets real light
# and real reflections while the backdrop stays brand black.
world = bpy.data.worlds.new("ZP_World")
scene.world = world
world.use_nodes = True
wnt = world.node_tree
wnt.nodes.clear()
wout = wnt.nodes.new("ShaderNodeOutputWorld")
wmix = wnt.nodes.new("ShaderNodeMixShader")
wpath = wnt.nodes.new("ShaderNodeLightPath")
bg_env = wnt.nodes.new("ShaderNodeBackground")
bg_cam = wnt.nodes.new("ShaderNodeBackground")

env = wnt.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(HERE, "hdri", "studio.hdr"))
emap = wnt.nodes.new("ShaderNodeMapping")
ecoord = wnt.nodes.new("ShaderNodeTexCoord")
emap.inputs["Rotation"].default_value = (0, 0, math.radians(-125))   # aim the key window
wnt.links.new(ecoord.outputs["Generated"], emap.inputs["Vector"])
wnt.links.new(emap.outputs["Vector"], env.inputs["Vector"])
esat = wnt.nodes.new("ShaderNodeHueSaturation")
esat.inputs["Saturation"].default_value = 0.30
wnt.links.new(env.outputs["Color"], esat.inputs["Color"])
wnt.links.new(esat.outputs["Color"], bg_env.inputs["Color"])
bg_env.inputs["Strength"].default_value = 0.80

# What the camera sees instead: near-black, with the faintest lift so it is not a void.
bg_cam.inputs["Color"].default_value = (0.004, 0.007, 0.012, 1)
bg_cam.inputs["Strength"].default_value = 1.0

wnt.links.new(wpath.outputs["Is Camera Ray"], wmix.inputs["Fac"])
wnt.links.new(bg_env.outputs["Background"], wmix.inputs[1])
wnt.links.new(bg_cam.outputs["Background"], wmix.inputs[2])
wnt.links.new(wmix.outputs["Shader"], wout.inputs["Surface"])


def area(name, gltf_pos, size, power, color, aim=(0, 0, 0.1)):
    """Area lights, because soft shadows and shaped speculars are the whole difference
    between a render and a photograph."""
    bpy.ops.object.light_add(type="AREA", location=to_blender(gltf_pos))
    L = bpy.context.object
    L.name = name
    L.data.size = size
    L.data.energy = power
    L.data.color = color
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=to_blender(aim))
    tgt = bpy.context.object
    tgt.name = name + "_aim"
    c = L.constraints.new("TRACK_TO")
    c.target = tgt
    return L


area("ZP_Key",  (2.4, 2.8, -1.5), 3.2, 380, (1.0, 0.98, 0.94))
area("ZP_Fill", (1.4, 0.5, 2.2),  2.6, 150, (0.80, 0.87, 1.0))
ZP_RIMS = [
    (area("ZP_RimL", (-1.6, 1.1, 2.6), 2.0, 420, (0.20, 0.42, 0.95)), 420),
    (area("ZP_RimR", (-1.8, 0.6, -2.4), 1.8, 300, (0.20, 0.42, 0.95)), 300),
]
area("ZP_Top",  (0.2, 3.0, 0.4),  2.2, 80, (0.88, 0.93, 1.0))

# ---------------------------------------------------------------- backdrop

def emitter(name, gltf_pos, dims, colour, power):
    """A box that emits. Cheap, and out at these distances the depth of field turns each one
    into a soft disc rather than a hard shape."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=to_blender(gltf_pos))
    o = bpy.context.object
    o.name = name
    o.dimensions = (dims[0], dims[2], dims[1])   # glTF (w, h, d) -> Blender (x, y, z)
    m = bpy.data.materials.new(name + "_mat")
    m.use_nodes = True
    mnt = m.node_tree
    mnt.nodes.clear()
    mo = mnt.nodes.new("ShaderNodeOutputMaterial")
    em = mnt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*colour, 1)
    em.inputs["Strength"].default_value = power
    mnt.links.new(em.outputs["Emission"], mo.inputs["Surface"])
    o.data.materials.append(m)
    o.visible_shadow = False        # these are set dressing, not shadow casters
    return em.inputs["Strength"], power


ZP_HALL = []
COOL = (0.42, 0.60, 1.0)
WARMISH = (0.72, 0.80, 1.0)

# A sparse, asymmetric suggestion of a hall — not a colonnade. Sixteen evenly spaced columns
# read as a barcode behind him; six irregular ones read as depth. Weighted to screen-right
# (-Z) on purpose, because the hero card sits bottom-left and needs dark ground under it.
#      x       z      height  width  power
for i, (x, z, h, w, pw) in enumerate([
    (-4.2,  -1.5,  2.7, 0.075, 1.15),
    (-5.6,  -3.1,  3.1, 0.090, 0.85),
    (-8.4,  -2.0,  3.5, 0.110, 0.62),
    (-7.1,  -5.2,  3.2, 0.100, 0.48),
    (-11.5, -3.6,  4.0, 0.140, 0.40),
    (-9.8,   2.9,  3.6, 0.120, 0.34),   # one on the far side, for asymmetry
    (-13.0,  0.6,  4.2, 0.150, 0.26),
]):
    ZP_HALL.append(emitter(f"ZP_Col_{i}", (x, GROUND_Y + h / 2, z),
                           (w, h, w), COOL if i % 2 else WARMISH, pw))

# Motes. Scattered wide and small: thoroughly out of focus, they read as drifting dust
# catching the light, and they give the empty half of the frame something to hold.
import random
random.seed(20260814)
for i in range(150):
    r = 1.2 + random.random() * 5.5
    a_ang = random.random() * math.tau
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=0.010 + random.random() * 0.022,
        location=to_blender((0.4 + random.random() * 3.0 - r * 0.25,
                             GROUND_Y + 0.15 + random.random() * 2.4,
                             math.cos(a_ang) * r)))
    mo = bpy.context.object
    mo.name = f"ZP_Mote_{i}"
    mm = bpy.data.materials.new(f"ZP_Mote_{i}_mat")
    mm.use_nodes = True
    mnt = mm.node_tree
    mnt.nodes.clear()
    out_n = mnt.nodes.new("ShaderNodeOutputMaterial")
    em = mnt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.62, 0.76, 1.0, 1)
    em.inputs["Strength"].default_value = 1.6 + random.random() * 3.4
    mnt.links.new(em.outputs["Emission"], out_n.inputs["Surface"])
    mo.data.materials.append(mm)
    mo.visible_shadow = False
    ZP_HALL.append((em.inputs["Strength"], em.inputs["Strength"].default_value))

# -------------------------------------------------------------------- camera

bpy.ops.object.camera_add()
cam = bpy.context.object
cam.name = "ZP_Cam"
cam.data.sensor_fit = "VERTICAL"
cam.data.sensor_height = 24.0
cam.data.lens = 24.0 / (2 * math.tan(math.radians(FOV_V) / 2))
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 1.8
scene.camera = cam

bpy.ops.object.empty_add(type="PLAIN_AXES")
look = bpy.context.object
look.name = "ZP_CamTarget"
tc = cam.constraints.new("TRACK_TO")
tc.target = look
cam.data.dof.focus_object = look

aspect = scene.render.resolution_x / scene.render.resolution_y

# Rendering the sequence as a keyframed animation rather than looping bpy.ops.render per
# frame. The loop crashed Cycles' Metal backend by recompiling kernels every frame
# (MetalKernelPipeline::compile throwing on the shader cache); the animation path compiles
# once and is the idiomatic route anyway.

def key(p_norm, frame):
    act = activation(p_norm)
    target, pos = place(p_norm, aspect)

    look.location = to_blender(target)
    look.keyframe_insert("location", frame=frame)
    cam.location = to_blender(pos)
    cam.keyframe_insert("location", frame=frame)

    ZP_GLOW_SCALE.default_value = 46.0 * act
    ZP_GLOW_SCALE.keyframe_insert("default_value", frame=frame)
    for sock in ZP_OPTIC:
        sock.default_value = 7.0 * act
        sock.keyframe_insert("default_value", frame=frame)
    for light, full in ZP_RIMS:
        light.data.energy = full * (0.10 + 0.90 * act)
        light.data.keyframe_insert("energy", frame=frame)
    # The room powers up with him — it is his infrastructure, so it should not already be on.
    for sock, full in ZP_HALL:
        sock.default_value = full * (0.14 + 0.86 * act)
        sock.keyframe_insert("default_value", frame=frame)
    return act


if ONLY_P is not None:
    # Single frame, for look checks.
    p_norm = float(ONLY_P)
    key(p_norm, 1)
    scene.frame_set(1)
    scene.render.filepath = os.path.join(ROOT, OUT, "f_0000.png")
    print(f"[zp] one frame at p={p_norm:.3f}, act={activation(p_norm):.2f}")
    bpy.ops.render.render(write_still=True)
else:
    scene.frame_start = 1
    scene.frame_end = FRAMES
    for i in range(FRAMES):
        key(i / (FRAMES - 1), i + 1)

    # No interpolation fix-ups needed: every frame carries its own key, so nothing is
    # ever interpolated. (Blender 5 also moved Action.fcurves behind slots/layers.)

    scene.render.filepath = os.path.join(ROOT, OUT, "f_")
    scene.render.image_settings.file_format = "PNG"
    print(f"[zp] rendering {FRAMES} frames at {scene.render.resolution_x}x{scene.render.resolution_y}, {SAMPLES} samples")
    bpy.ops.render.render(animation=True)

print("[zp] done")
