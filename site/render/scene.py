# ZeroPoint — the film. Builds the scene in Blender and renders the camera move.
#
#   blender -b -P render/scene.py -- --at 0.42 --out render/look --width 1920 --samples 64
#   blender -b -P render/scene.py -- --frames 360 --out render/seq --width 2560 --samples 128
#
# The browser cannot render this asset to the quality the reference images set, and never will:
# real-time WebGL has a hard ceiling, Cycles does not. So the move is rendered here and the
# site plays the frames back on scroll — the same mechanism the Bloom reference uses for its
# video, and the same one the previous ZeroPoint site used for its 489-frame sequence.
#
# CHOREOGRAPHY — one continuous 15-second move, no cuts
#   0.00–0.10  hero: face close, eyes DEAD. He is powered down.
#   0.10–0.22  activation: the visor ignites, the tracery lights, the chest mark wakes.
#   0.22–0.32  travel down to the chest.
#   0.32–0.52  out to his right hand (screen-right).
#   0.52–0.62  back to the chest.
#   0.62–0.79  out to his left hand (screen-left) — where the services are revealed.
#   0.79–0.88  back to the chest.
#   0.88–1.00  he rotates on the spot, camera held: the showroom turn.
#
# COORDINATES. The path is written in glTF space — +X is the direction he faces, +Y is up, +Z
# is his screen-left — because that is the space the measured landmarks are in
# (tools/landmarks.mjs, tools/disc.mjs). Blender's glTF importer maps (x, y, z) -> (x, -z, y),
# and to_blender() is the only place that conversion happens.

import bpy, sys, math, os, random
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default):
    return argv[argv.index(name) + 1] if name in argv else default


FRAMES = int(arg("--frames", 1))
OUT = arg("--out", "render/test")
WIDTH = int(arg("--width", 2560))
SAMPLES = int(arg("--samples", 128))
ONLY_P = arg("--at", None)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIG = os.path.normpath(os.path.join(ROOT, "..", "test", "armored_suit.glb"))
LOGO = os.path.normpath(os.path.join(ROOT, "..", "test", "zp_logo_3d.glb"))
TEX = {k: os.path.join(HERE, v) for k, v in
       {"base": "basecolor.png", "glow": "glow.png", "orm": "orm.png"}.items()}

GROUND_Y = -0.9245
CHEST_DISC = (0.1706, 0.4616, 0.0)     # measured: tools/disc.mjs
DISC_SIZE = 0.1288
FOV_V = 30.0

# p, target, frame height, azimuth (neg = swing toward screen-right), elevation, figure spin
PATH = [
    (0.00, (0.02, 0.775, 0.00),  0.42, -10.0, 2.0,   0.0),   # face, tight — the eyes are the shot
    (0.10, (0.02, 0.770, 0.00),  0.46, -14.0, 3.0,   0.0),   # holds while he wakes
    (0.22, (0.01, 0.640, 0.00),  0.72, -12.0, 4.0,   0.0),   # start down
    (0.32, (0.00, 0.462, 0.00),  0.60,  -6.0, 1.0,   0.0),   # the mark, lit
    (0.44, (0.01, 0.140, -0.22), 0.78, -20.0, 8.0,   0.0),   # swinging out to his right hand
    (0.52, (0.03, 0.020, -0.33), 0.44, -25.0, 11.0,  0.0),   # right hand
    (0.62, (0.00, 0.440, 0.00),  0.66,  -8.0, 2.0,   0.0),   # back to the mark
    (0.72, (0.01, 0.140, 0.22),  0.78,  20.0, 8.0,   0.0),   # out to his left hand
    (0.79, (0.03, 0.020, 0.33),  0.44,  25.0, 11.0,  0.0),   # left hand — services
    (0.88, (0.00, 0.450, 0.00),  0.70,   0.0, 2.0,   0.0),   # back to the mark, squared up
    (1.00, (0.00, 0.330, 0.00),  1.35,   0.0, 3.0, 118.0),   # pull out; he turns
]


def to_blender(p):
    """glTF (x, y, z) -> Blender (x, -z, y)."""
    return Vector((p[0], -p[2], p[1]))


def smootherstep(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def activation(p):
    """0 = powered down, 1 = fully lit. Dead on arrival; wakes as soon as you scroll."""
    t = min(1.0, max(0.0, (p - 0.035) / 0.115))
    return t * t * (3 - 2 * t)


def sample_path(p):
    t = min(1.0, max(0.0, p))
    i = 0
    while i < len(PATH) - 2 and t >= PATH[i + 1][0]:
        i += 1
    a, b = PATH[i], PATH[i + 1]
    k = smootherstep(min(1.0, max(0.0, (t - a[0]) / (b[0] - a[0]))))
    f = lambda x, y: x + (y - x) * k
    return (tuple(f(a[1][j], b[1][j]) for j in range(3)),
            f(a[2], b[2]), math.radians(f(a[3], b[3])),
            math.radians(f(a[4], b[4])), math.radians(f(a[5], b[5])))


def place(p):
    target, frame, az, el, spin = sample_path(p)
    dist = (frame / 2) / math.tan(math.radians(FOV_V) / 2)
    ce = math.cos(el)
    return target, (target[0] + ce * math.cos(az) * dist,
                    target[1] + math.sin(el) * dist,
                    target[2] + ce * math.sin(az) * dist), spin


# --------------------------------------------------------------------- scene

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "GPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 10
scene.cycles.glossy_bounces = 6          # a shiny suit needs its reflections to bounce
scene.cycles.transmission_bounces = 4
scene.cycles.caustics_reflective = False
scene.render.resolution_x = WIDTH
scene.render.resolution_y = int(WIDTH * 9 / 16)
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.compression = 15
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Punchy"
scene.view_settings.exposure = -0.55

prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
except Exception as e:
    print("[zp] GPU setup note:", e)

bpy.ops.import_scene.gltf(filepath=FIG)
figure = next(o for o in bpy.context.selected_objects if o.type == "MESH")
figure.name = "ZP_Figure"

bpy.ops.import_scene.gltf(filepath=LOGO)
logo_objs = [o for o in bpy.context.selected_objects if o.type == "MESH"]

# He and his mark turn together, and only they turn — the camera and lights hold, which is
# what makes the closing move read as a showroom turntable rather than a camera orbit.
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
spin_root = bpy.context.object
spin_root.name = "ZP_SpinRoot"

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

# The albedo paints big near-white patches — the chest disc, the hips, the knees. On a
# lacquered dark suit those read as stickers, and the white chest disc in particular fought
# the mark that is meant to sit in it. Remapping the brightest trim to dark steel makes the
# mark read as machined INTO a housing, and pulls the whole suit together.
trim_mask = nt.nodes.new("ShaderNodeValToRGB")
trim_mask.color_ramp.elements[0].position = 0.55
trim_mask.color_ramp.elements[1].position = 0.80
steel = nt.nodes.new("ShaderNodeRGB")
steel.outputs[0].default_value = (0.055, 0.062, 0.075, 1)
base_mix = nt.nodes.new("ShaderNodeMixRGB")
base_mix.blend_type = "MIX"
nt.links.new(tex_base.outputs["Color"], trim_mask.inputs["Fac"])
nt.links.new(trim_mask.outputs["Color"], base_mix.inputs["Fac"])
nt.links.new(tex_base.outputs["Color"], base_mix.inputs[1])
nt.links.new(steel.outputs[0], base_mix.inputs[2])
nt.links.new(base_mix.outputs["Color"], bsdf.inputs["Base Color"])

# Roughness from the ORM's green channel, scaled down hard: this is lacquered armour, so it
# should be glossy everywhere and mirror-like nowhere.
tex_orm = nt.nodes.new("ShaderNodeTexImage")
tex_orm.image = image(TEX["orm"], non_color=True)
split = nt.nodes.new("ShaderNodeSeparateColor")
nt.links.new(tex_orm.outputs["Color"], split.inputs["Color"])
rough_scale = nt.nodes.new("ShaderNodeMath")
rough_scale.operation = "MULTIPLY"
rough_scale.inputs[1].default_value = 0.42
nt.links.new(split.outputs["Green"], rough_scale.inputs[0])
nt.links.new(rough_scale.outputs["Value"], bsdf.inputs["Roughness"])
bsdf.inputs["Metallic"].default_value = 0.82

# Micro-surface. The asset has no normal map, and deriving one from a low-bitrate JPEG only
# reproduced its compression blocks. Generating it procedurally instead gives real machined
# character — fine grain plus a slow undulation, so highlights break up across a panel
# instead of sliding over it like plastic.
grain = nt.nodes.new("ShaderNodeTexNoise")
grain.inputs["Scale"].default_value = 640.0
grain.inputs["Detail"].default_value = 3.0
grain.inputs["Roughness"].default_value = 0.55
swell = nt.nodes.new("ShaderNodeTexNoise")
swell.inputs["Scale"].default_value = 26.0
swell.inputs["Detail"].default_value = 2.0
micro = nt.nodes.new("ShaderNodeMixRGB")
micro.blend_type = "ADD"
micro.inputs["Fac"].default_value = 0.35
nt.links.new(grain.outputs["Fac"], micro.inputs[1])
nt.links.new(swell.outputs["Fac"], micro.inputs[2])
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.14
bump.inputs["Distance"].default_value = 0.004
nt.links.new(micro.outputs["Color"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

# Clear coat — the lacquer. This is the single thing separating an Iron Man suit from a raw
# metal casting: a second, sharper specular layer sitting over the base.
if "Coat Weight" in bsdf.inputs:
    bsdf.inputs["Coat Weight"].default_value = 0.85
    bsdf.inputs["Coat Roughness"].default_value = 0.055
    if "Coat IOR" in bsdf.inputs:
        bsdf.inputs["Coat IOR"].default_value = 1.55

tex_glow = nt.nodes.new("ShaderNodeTexImage")
tex_glow.image = image(TEX["glow"])
glow_mul = nt.nodes.new("ShaderNodeVectorMath")
glow_mul.operation = "SCALE"
glow_mul.inputs["Scale"].default_value = 0.0
nt.links.new(tex_glow.outputs["Color"], glow_mul.inputs[0])
nt.links.new(glow_mul.outputs["Vector"], bsdf.inputs["Emission Color"])
bsdf.inputs["Emission Strength"].default_value = 1.0
ZP_GLOW = glow_mul.inputs["Scale"]

figure.data.materials.clear()
figure.data.materials.append(mat)
figure.parent = spin_root

# ---------------------------------------------------------------- chest mark

# Seated INTO the chest rather than stood on it: the mark is 0.1256 across and the measured
# disc is 0.1288, so it fits 1:1, and it is pushed below the surface so the blades sit in a
# recess. The face normal is +Z after the importer's axis conversion, and R_y(theta) maps
# (0,0,1) -> (sin theta, 0, cos theta) — so +90 points it out of the chest along +X. -90
# pointed it inward, which is why the mark used to read as a mirrored blob.
ZP_OPTIC = []
fit = (DISC_SIZE * 0.99) / 0.1256
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
pivot = bpy.context.object
pivot.name = "ZP_MarkPivot"
for o in logo_objs:
    o.parent = pivot
pivot.scale = (fit, fit, fit)
pivot.rotation_euler = (0, math.radians(90), 0)
pivot.location = to_blender((CHEST_DISC[0] - 0.010, CHEST_DISC[1], CHEST_DISC[2]))
pivot.parent = spin_root

for o in logo_objs:
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        pb = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not pb:
            continue
        if "optic" in (m.name or "").lower():
            pb.inputs["Base Color"].default_value = (0.02, 0.05, 0.14, 1)
            pb.inputs["Emission Color"].default_value = (0.20, 0.44, 1.0, 1)
            pb.inputs["Emission Strength"].default_value = 0.0
            pb.inputs["Roughness"].default_value = 0.08
            pb.inputs["Metallic"].default_value = 0.3
            ZP_OPTIC.append(pb.inputs["Emission Strength"])
        else:
            pb.inputs["Base Color"].default_value = (0.035, 0.040, 0.050, 1)
            pb.inputs["Metallic"].default_value = 0.9
            pb.inputs["Roughness"].default_value = 0.14
            if "Coat Weight" in pb.inputs:
                pb.inputs["Coat Weight"].default_value = 0.7

# ----------------------------------------------------------------- environment

# A real captured studio (Poly Haven ferndale_studio_02, CC0 — see hdri/CREDIT.txt), visible
# to reflections and lighting but muted on camera rays, so the suit gets real light and real
# reflections while the backdrop stays brand black. Desaturated because the raw HDRI cast the
# whole suit teal.
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
emap.inputs["Rotation"].default_value = (0, 0, math.radians(-125))
esat = wnt.nodes.new("ShaderNodeHueSaturation")
esat.inputs["Saturation"].default_value = 0.30
wnt.links.new(ecoord.outputs["Generated"], emap.inputs["Vector"])
wnt.links.new(emap.outputs["Vector"], env.inputs["Vector"])
wnt.links.new(env.outputs["Color"], esat.inputs["Color"])
wnt.links.new(esat.outputs["Color"], bg_env.inputs["Color"])
bg_env.inputs["Strength"].default_value = 0.85
bg_cam.inputs["Color"].default_value = (0.004, 0.007, 0.012, 1)
wnt.links.new(wpath.outputs["Is Camera Ray"], wmix.inputs["Fac"])
wnt.links.new(bg_env.outputs["Background"], wmix.inputs[1])
wnt.links.new(bg_cam.outputs["Background"], wmix.inputs[2])
wnt.links.new(wmix.outputs["Shader"], wout.inputs["Surface"])


def area(name, gltf_pos, size, power, color, aim=(0, 0.2, 0)):
    bpy.ops.object.light_add(type="AREA", location=to_blender(gltf_pos))
    L = bpy.context.object
    L.name = name
    L.data.size = size
    L.data.energy = power
    L.data.color = color
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=to_blender(aim))
    tgt = bpy.context.object
    tgt.name = name + "_aim"
    L.constraints.new("TRACK_TO").target = tgt
    return L


area("ZP_Key",  (2.4, 2.8, -1.5), 3.2, 380, (1.0, 0.98, 0.94))
area("ZP_Fill", (1.4, 0.5, 2.2),  2.6, 150, (0.80, 0.87, 1.0))
area("ZP_Top",  (0.2, 3.0, 0.4),  2.2, 80,  (0.88, 0.93, 1.0))
ZP_RIMS = [
    (area("ZP_RimL", (-1.6, 1.1, 2.6), 2.0, 420, (0.20, 0.42, 0.95)), 420),
    (area("ZP_RimR", (-1.8, 0.6, -2.4), 1.8, 300, (0.20, 0.42, 0.95)), 300),
]

# Floor: glossy enough to hold his reflection, faded to transparent past his feet so its far
# edge never draws a horizon and its outer reaches never mirror the studio's windows.
bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, GROUND_Y))
floor = bpy.context.object
floor.name = "ZP_Floor"
fm = bpy.data.materials.new("ZP_FloorMat")
fm.use_nodes = True
fb = fm.node_tree.nodes["Principled BSDF"]
fb.inputs["Base Color"].default_value = (0.008, 0.011, 0.017, 1)
fb.inputs["Roughness"].default_value = 0.34
fb.inputs["Metallic"].default_value = 0.22
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

# ---------------------------------------------------------------- backdrop


def emitter(name, gltf_pos, dims, colour, power):
    bpy.ops.mesh.primitive_cube_add(size=1, location=to_blender(gltf_pos))
    o = bpy.context.object
    o.name = name
    o.dimensions = (dims[0], dims[2], dims[1])
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
    o.visible_shadow = False
    return em.inputs["Strength"], power


ZP_HALL = []
COOL, WARMISH = (0.42, 0.60, 1.0), (0.72, 0.80, 1.0)

# Sparse and asymmetric: sixteen evenly spaced columns read as a barcode, seven irregular ones
# read as depth. Weighted to screen-right because the hero card sits bottom-left.
for i, (x, z, h, w, pw) in enumerate([
    (-4.2, -1.5, 2.7, 0.075, 1.15), (-5.6, -3.1, 3.1, 0.090, 0.85),
    (-8.4, -2.0, 3.5, 0.110, 0.62), (-7.1, -5.2, 3.2, 0.100, 0.48),
    (-11.5, -3.6, 4.0, 0.140, 0.40), (-9.8, 2.9, 3.6, 0.120, 0.34),
    (-13.0, 0.6, 4.2, 0.150, 0.26),
]):
    ZP_HALL.append(emitter(f"ZP_Col_{i}", (x, GROUND_Y + h / 2, z), (w, h, w),
                           COOL if i % 2 else WARMISH, pw))

random.seed(20260814)
for i in range(150):
    r = 1.2 + random.random() * 5.5
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1, radius=0.010 + random.random() * 0.022,
        location=to_blender((0.4 + random.random() * 3.0 - r * 0.25,
                             GROUND_Y + 0.15 + random.random() * 2.4,
                             math.cos(random.random() * math.tau) * r)))
    mo = bpy.context.object
    mo.name = f"ZP_Mote_{i}"
    mm = bpy.data.materials.new(f"ZP_Mote_{i}_mat")
    mm.use_nodes = True
    mnt = mm.node_tree
    mnt.nodes.clear()
    on = mnt.nodes.new("ShaderNodeOutputMaterial")
    em = mnt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.62, 0.76, 1.0, 1)
    em.inputs["Strength"].default_value = 1.6 + random.random() * 3.4
    mnt.links.new(em.outputs["Emission"], on.inputs["Surface"])
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
cam.constraints.new("TRACK_TO").target = look
cam.data.dof.focus_object = look

# --------------------------------------------------------------------- render

# Keyframed and rendered as an animation. Looping bpy.ops.render per frame crashed Cycles'
# Metal backend on kernel recompilation; the animation path compiles once.


def key(p_norm, frame):
    act = activation(p_norm)
    target, pos, spin = place(p_norm)

    look.location = to_blender(target)
    look.keyframe_insert("location", frame=frame)
    cam.location = to_blender(pos)
    cam.keyframe_insert("location", frame=frame)

    spin_root.rotation_euler = (0, 0, spin)
    spin_root.keyframe_insert("rotation_euler", frame=frame)

    ZP_GLOW.default_value = 46.0 * act
    ZP_GLOW.keyframe_insert("default_value", frame=frame)
    for sock in ZP_OPTIC:
        sock.default_value = 9.0 * act
        sock.keyframe_insert("default_value", frame=frame)
    for light, full in ZP_RIMS:
        light.data.energy = full * (0.08 + 0.92 * act)
        light.data.keyframe_insert("energy", frame=frame)
    for sock, full in ZP_HALL:
        sock.default_value = full * (0.12 + 0.88 * act)
        sock.keyframe_insert("default_value", frame=frame)
    return act


os.makedirs(os.path.join(ROOT, OUT), exist_ok=True)

if ONLY_P is not None:
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
    # Every frame carries its own key, so nothing is ever interpolated.
    scene.render.filepath = os.path.join(ROOT, OUT, "f_")
    print(f"[zp] rendering {FRAMES} frames at {scene.render.resolution_x}x"
          f"{scene.render.resolution_y}, {SAMPLES} samples")
    bpy.ops.render.render(animation=True)

print("[zp] done")
