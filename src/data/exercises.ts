import type { Exercise } from '../types';

export const EXERCISES: Exercise[] = [
  // ── Neck / shoulders / chest ────────────────────────────────────────────
  {
    id: 'neck-side-tilt',
    name: 'Neck Side Tilt',
    instructions:
      'Sit or stand tall. Tilt your ear toward your shoulder until you feel a stretch along the side of your neck. Let the opposite shoulder hang heavy.',
    targetAreas: ['neck'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
    tips: 'For more depth, gently rest the hand of the tilting side on your head — never pull.',
  },
  {
    id: 'cross-body-shoulder',
    name: 'Cross-Body Shoulder Stretch',
    instructions:
      'Bring one arm straight across your chest. Use the other forearm to hug it closer until you feel the stretch in the back of your shoulder.',
    targetAreas: ['shoulders'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'overhead-triceps',
    name: 'Overhead Triceps Stretch',
    instructions:
      'Reach one arm overhead and drop the hand behind your neck. With the other hand, gently press the elbow back and down.',
    targetAreas: ['arms', 'shoulders'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'thread-the-needle',
    name: 'Thread the Needle',
    instructions:
      'From all fours, slide one arm under your chest with the palm up, lowering your shoulder and ear to the floor. Feel the stretch between your shoulder blades.',
    targetAreas: ['shoulders', 'back'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'wall-chest-opener',
    name: 'Wall Chest Opener',
    instructions:
      'Place your forearm against a wall or door frame with the elbow at shoulder height. Step forward and rotate your chest away until the front of your shoulder opens up.',
    targetAreas: ['chest', 'shoulders'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
    tips: 'Great after a climbing session — climbers get tight in the chest from pulling.',
  },
  {
    id: 'eagle-arms',
    name: 'Eagle Arms',
    instructions:
      'Wrap one arm under the other in front of you, aiming to touch palms. Lift the elbows and push the forearms away to stretch the upper back and rear shoulders.',
    targetAreas: ['shoulders', 'back'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },

  // ── Wrists / fingers (climbing gold) ────────────────────────────────────
  {
    id: 'wrist-flexor-stretch',
    name: 'Wrist Flexor Stretch',
    instructions:
      'Extend one arm with the palm up. With the other hand, gently pull the fingers back and down until you feel a stretch along the inside of your forearm.',
    targetAreas: ['wrists', 'arms'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
    tips: 'The single most important stretch for climbers. Keep the elbow straight.',
  },
  {
    id: 'wrist-extensor-stretch',
    name: 'Wrist Extensor Stretch',
    instructions:
      'Extend one arm with the palm down and let the hand hang. Use the other hand to gently press the back of the hand toward you, stretching the top of the forearm.',
    targetAreas: ['wrists', 'arms'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'prayer-stretch',
    name: 'Prayer Stretch',
    instructions:
      'Press your palms together in front of your chest, fingers pointing up. Slowly lower your hands while keeping the palms glued together until your wrists stretch.',
    targetAreas: ['wrists'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'both',
  },
  {
    id: 'finger-extensor-spread',
    name: 'Finger Extensor Spread',
    instructions:
      'Place a rubber band around your fingertips or simply spread your fingers as wide as possible against gentle resistance. Open and hold, then relax.',
    targetAreas: ['fingers'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'both',
    tips: 'Antagonist work for crimping — do this after every climbing session.',
  },
  {
    id: 'wrist-circles',
    name: 'Wrist Circles',
    instructions:
      'Interlace your fingers and roll your wrists slowly through full circles in both directions. Keep the movement smooth and unhurried.',
    targetAreas: ['wrists'],
    modality: 'dynamic',
    defaultDurationSec: 30,
    side: 'both',
  },

  // ── Back / core ─────────────────────────────────────────────────────────
  {
    id: 'cat-cow',
    name: 'Cat-Cow',
    instructions:
      'On all fours, alternate slowly between arching your back up like an angry cat and dipping it down while lifting your gaze. Move with your breath.',
    targetAreas: ['back', 'core'],
    modality: 'dynamic',
    defaultDurationSec: 40,
    side: 'both',
  },
  {
    id: 'childs-pose',
    name: "Child's Pose",
    instructions:
      'Kneel, sit back on your heels and fold forward, reaching your arms out along the floor. Let your forehead rest down and breathe into your back.',
    targetAreas: ['back', 'hips', 'shoulders'],
    modality: 'static',
    defaultDurationSec: 40,
    side: 'both',
  },
  {
    id: 'cobra',
    name: 'Cobra',
    instructions:
      'Lie face down, hands under your shoulders. Press your chest up while keeping your hips on the floor, opening the front of your body.',
    targetAreas: ['core', 'back', 'chest'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'both',
  },
  {
    id: 'seated-spinal-twist',
    name: 'Seated Spinal Twist',
    instructions:
      'Sit with one leg extended, cross the other foot over that knee. Hug the raised knee and rotate your torso toward it, looking over your shoulder.',
    targetAreas: ['back', 'glutes', 'core'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'standing-side-bend',
    name: 'Standing Side Bend',
    instructions:
      'Stand tall, reach one arm overhead and lean sideways away from it. Feel the stretch open the whole side of your torso from hip to fingertips.',
    targetAreas: ['core', 'back'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'thoracic-wall-extension',
    name: 'Thoracic Wall Extension',
    instructions:
      'Face a wall at arm’s length, place both hands on it and walk them up. Drop your chest through your arms, keeping your spine long. Opens the upper back for overhead reaches.',
    targetAreas: ['back', 'shoulders'],
    modality: 'dynamic',
    defaultDurationSec: 40,
    side: 'both',
  },

  // ── Hips / glutes ───────────────────────────────────────────────────────
  {
    id: 'pigeon-pose',
    name: 'Pigeon Pose',
    instructions:
      'From all fours, bring one knee forward behind your wrist with the shin angled across. Extend the other leg back and settle your hips down, folding forward if comfortable.',
    targetAreas: ['hips', 'glutes'],
    modality: 'static',
    defaultDurationSec: 45,
    side: 'per-side',
    tips: 'The classic climber hip opener. Use a cushion under the hip if it hovers.',
  },
  {
    id: 'butterfly',
    name: 'Butterfly Stretch',
    instructions:
      'Sit with the soles of your feet together and knees dropped out wide. Hold your feet, sit tall, and gently lean forward from the hips.',
    targetAreas: ['hips', 'glutes'],
    modality: 'static',
    defaultDurationSec: 40,
    side: 'both',
  },
  {
    id: 'ninety-ninety',
    name: '90/90 Hip Switch',
    instructions:
      'Sit with your front leg bent 90° in front and the rear leg bent 90° to the side. Keep your chest tall and lean over the front shin, then switch sides slowly.',
    targetAreas: ['hips', 'glutes'],
    modality: 'dynamic',
    defaultDurationSec: 40,
    side: 'per-side',
  },
  {
    id: 'deep-squat-hold',
    name: 'Deep Squat Hold',
    instructions:
      'Squat as low as you can with heels down and feet slightly turned out. Use your elbows to press your knees outward and keep your chest lifted.',
    targetAreas: ['hips', 'ankles', 'glutes'],
    modality: 'static',
    defaultDurationSec: 45,
    side: 'both',
    tips: 'Essential for high steps and rock-overs on the wall.',
  },
  {
    id: 'figure-four',
    name: 'Figure-Four Stretch',
    instructions:
      'Lie on your back, cross one ankle over the opposite knee, and pull that thigh toward your chest until the outside of your hip stretches.',
    targetAreas: ['glutes', 'hips'],
    modality: 'static',
    defaultDurationSec: 40,
    side: 'per-side',
  },
  {
    id: 'frog-pose',
    name: 'Frog Pose',
    instructions:
      'From all fours, widen your knees as far as comfortable with feet in line with the knees. Sink your hips back and down, resting on your forearms.',
    targetAreas: ['hips', 'adductors'],
    modality: 'static',
    defaultDurationSec: 45,
    side: 'both',
    purpose: 'Passive hip abduction and external rotation, held long enough to change tissue.',
  },
  {
    id: 'lizard-lunge',
    name: 'Lizard Lunge',
    instructions:
      'Step one foot outside your hands in a low lunge. Sink your hips forward and down; drop to forearms for more depth. Keep the back leg long.',
    targetAreas: ['hips', 'quads'],
    modality: 'static',
    defaultDurationSec: 40,
    side: 'per-side',
  },

  // ── Legs / feet (running gold) ──────────────────────────────────────────
  {
    id: 'standing-hamstring',
    name: 'Standing Hamstring Stretch',
    instructions:
      'Place one heel on a low step with the leg straight. Hinge forward from the hips with a flat back until the back of your thigh stretches.',
    targetAreas: ['hamstrings'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'lying-hamstring',
    name: 'Lying Hamstring Stretch',
    instructions:
      'Lie on your back and raise one straight leg. Hold behind the thigh or calf (or use a towel) and draw the leg gently toward you.',
    targetAreas: ['hamstrings', 'calves'],
    modality: 'static',
    defaultDurationSec: 45,
    side: 'per-side',
  },
  {
    id: 'standing-quad',
    name: 'Standing Quad Stretch',
    instructions:
      'Stand on one leg (hold something for balance), grab your other ankle behind you and draw the heel toward your glutes. Keep knees together and hips square.',
    targetAreas: ['quads'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'kneeling-hip-flexor',
    name: 'Kneeling Hip-Flexor Lunge',
    instructions:
      'Kneel on one knee in a lunge. Tuck your pelvis, squeeze the glute of the kneeling side and shift forward until the front of that hip stretches.',
    targetAreas: ['hips', 'quads'],
    modality: 'static',
    defaultDurationSec: 45,
    side: 'per-side',
    tips: 'Runners live here — tight hip flexors steal your stride length.',
  },
  {
    id: 'straight-leg-calf',
    name: 'Straight-Leg Calf Stretch',
    instructions:
      'Step one foot back, press the heel into the floor and keep that leg straight while leaning into a wall. Stretch the upper calf.',
    targetAreas: ['calves'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'bent-knee-calf',
    name: 'Bent-Knee Calf Stretch',
    instructions:
      'Same wall position as the straight-leg version, but bend the back knee slightly while keeping the heel down. This targets the deeper soleus muscle.',
    targetAreas: ['calves', 'ankles'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'itband-crossover',
    name: 'IT-Band Cross-Over',
    instructions:
      'Cross one leg behind the other and lean your hips toward the side of the back leg, reaching the same-side arm overhead. Stretch along the outer hip and thigh.',
    targetAreas: ['hips', 'quads'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'per-side',
  },
  {
    id: 'plantar-toe-stretch',
    name: 'Plantar & Toe Stretch',
    instructions:
      'Kneel with your toes tucked under and slowly sit back onto your heels. Feel the stretch through the soles of your feet and toes.',
    targetAreas: ['feet', 'ankles'],
    modality: 'static',
    defaultDurationSec: 30,
    side: 'both',
  },
  {
    id: 'ankle-circles',
    name: 'Ankle Circles',
    instructions:
      'Lift one foot and draw slow, full circles with your toes — both directions. Keep the movement controlled through the whole range.',
    targetAreas: ['ankles', 'feet'],
    modality: 'dynamic',
    defaultDurationSec: 30,
    side: 'per-side',
  },

  // ── Protocol drills: dynamic hip prep (pre-climbing) ────────────────────
  {
    id: 'leg-swings-sagittal',
    name: 'Leg Swings, Front-to-Back',
    instructions:
      'Hold a wall for balance and swing one leg forward and back, relaxed and rhythmic. Let the range grow over the first few swings rather than forcing it immediately.',
    targetAreas: ['hips', 'hamstrings', 'quads'],
    modality: 'dynamic',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'Wakes hip flexion and extension, and sets the tempo for the session.',
  },
  {
    id: 'leg-swings-lateral',
    name: 'Leg Swings, Side-to-Side',
    instructions:
      'Face the wall and swing one leg across your body and out to the side. Keep your torso still so the movement happens at the hip, not the spine.',
    targetAreas: ['hips', 'adductors', 'glutes'],
    modality: 'dynamic',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'Opens abduction and adduction ahead of wide foot placements.',
  },
  {
    id: 'ninety-ninety-switches',
    name: '90/90 Switches',
    instructions:
      'Sit with both knees bent at 90 degrees, one leg in front and one to the side. Rotate through the floor to swap sides without using your hands. Keep your chest tall.',
    targetAreas: ['hips', 'glutes'],
    modality: 'dynamic',
    defaultDurationSec: 90,
    side: 'both',
    purpose: 'Internal and external hip rotation — the drop knee and egyptian positions.',
  },
  {
    id: 'deep-squat-pry',
    name: 'Deep Squat Pry',
    instructions:
      'Sink into a deep squat, place your elbows inside your knees and pry them gently outward. Shift your weight side to side and let your heels stay down.',
    targetAreas: ['hips', 'adductors', 'ankles'],
    modality: 'dynamic',
    defaultDurationSec: 60,
    side: 'both',
    purpose: 'Hip flexion, adductor length and ankle dorsiflexion in one position.',
  },
  {
    id: 'step-out-side-lunge',
    name: 'Step Out Side Lunge',
    instructions:
      'From standing, step wide to one side and sit back into that hip, knee tracking over the foot. The trailing leg stays long with the foot flat. Push off to stand tall, then step out to the other side.',
    targetAreas: ['adductors', 'hips', 'quads'],
    modality: 'dynamic',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'Adductor length and lateral hip strength through a range you step into.',
    tips: 'Stepping out and back means you never sit in a range you cannot get out of. Hold a kettlebell at your chest once the pattern is easy.',
  },
  {
    id: 'frog-rocks',
    name: 'Frog Rocks',
    instructions:
      'On all fours, widen your knees with shins in line and feet turned out. Rock your hips back toward your heels and return, staying inside a range you control.',
    targetAreas: ['hips', 'adductors'],
    modality: 'dynamic',
    defaultDurationSec: 60,
    side: 'both',
    purpose: 'Hip abduction and external rotation close to the wall position.',
  },
  {
    id: 'worlds-greatest-stretch',
    name: "World's Greatest Stretch",
    instructions:
      'Step into a deep lunge, drop the back knee toward the floor and place the inside hand down. Rotate the outside arm up toward the ceiling, then switch sides.',
    targetAreas: ['hips', 'back', 'hamstrings'],
    modality: 'dynamic',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'Hip flexor length plus rotation — the counter to hours in the saddle.',
  },
  {
    id: 'atg-split-squat',
    name: 'ATG Split Squat',
    instructions:
      'From a long split stance, sink until the back knee is near the floor and the front knee travels well past the toes, heel staying down. Stand back up through the front foot.',
    targetAreas: ['ankles', 'quads', 'hips'],
    modality: 'dynamic',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'Dorsiflexion and knee-over-toe strength, with the back hip opening at the same time.',
    tips: 'Shorten the stance until the front heel stays down — that is the range that counts. Pad the back knee if the floor is hard.',
  },

  // ── Protocol drills: running prep ───────────────────────────────────────
  {
    id: 'jog-in-place',
    name: 'Jog in Place',
    instructions:
      'Easy jogging on the spot or a brisk walk. The only goal is to raise your temperature and get blood moving — you should still be able to talk comfortably.',
    targetAreas: ['calves', 'quads', 'hips'],
    modality: 'dynamic',
    defaultDurationSec: 60,
    side: 'both',
    purpose: 'Raise: temperature and blood flow before anything else.',
  },
  {
    id: 'walking-lunge-rotation',
    name: 'Walking Lunge with Rotation',
    instructions:
      'Step into a lunge and rotate your torso over the front leg. Push through the front heel to stand, then step into the next lunge on the other side.',
    targetAreas: ['hips', 'quads', 'back'],
    modality: 'dynamic',
    defaultDurationSec: 60,
    side: 'both',
    purpose: 'Hip flexor length and glute activation in one movement.',
  },
  {
    id: 'single-leg-glute-bridge',
    name: 'Single Leg Glute Bridge',
    instructions:
      'Lie on your back with one foot flat and the other knee drawn toward your chest. Drive through the planted heel to lift your hips, pause at the top, and lower without letting the pelvis twist.',
    targetAreas: ['glutes', 'core', 'hips'],
    modality: 'activation',
    defaultDurationSec: 60,
    side: 'per-side',
    purpose: 'One glute at a time, which is how they work when you climb or run.',
    tips: 'The pelvis staying level is the exercise. Drop the range before you let it drop on one side.',
  },
  {
    id: 'a-skips',
    name: 'A-Skips',
    instructions:
      'Skip forward driving one knee to hip height with a quick, light ground contact. Stay tall and let the arms swing in opposition.',
    targetAreas: ['hips', 'calves', 'ankles'],
    modality: 'potentiation',
    defaultDurationSec: 45,
    side: 'both',
    purpose: 'Running-specific coordination and elastic ground contact.',
  },
  {
    id: 'high-knees-butt-kicks',
    name: 'High Knees & Butt Kicks',
    instructions:
      'Alternate 15 seconds of high knees with 15 seconds of heels to the glutes. Keep the contacts quick and quiet rather than big.',
    targetAreas: ['hips', 'quads', 'hamstrings'],
    modality: 'potentiation',
    defaultDurationSec: 45,
    side: 'both',
    purpose: 'Neural drive and cadence before the first kilometre.',
  },
  {
    id: 'build-up-strides',
    name: 'Build-Up Strides',
    instructions:
      'Two or three relaxed accelerations of about 20 seconds, building to a touch faster than your planned pace and easing off. Walk back between them.',
    targetAreas: ['hamstrings', 'calves', 'hips'],
    modality: 'potentiation',
    defaultDurationSec: 90,
    side: 'both',
    purpose: 'Post-activation potentiation — bridges the gap to running pace.',
  },

  // ── Protocol drills: loaded and static, away from performance ───────────
  {
    id: 'nordic-hamstring',
    name: 'Nordic Hamstring Curl',
    instructions:
      'Kneel with your ankles anchored or held. Lower your torso toward the floor as slowly as you can control, catch yourself with your hands, and push back up.',
    targetAreas: ['hamstrings', 'glutes'],
    modality: 'eccentric',
    mode: 'reps',
    defaultDurationSec: 40,
    defaultReps: 5,
    side: 'both',
    purpose: 'The strongest evidence-backed guard against hamstring tears — the heel-hook injury.',
    tips: 'Start assisted and expect soreness for the first two weeks. Maintenance sits around 48 reps a week spread over sessions.',
  },
  {
    id: 'copenhagen-adduction',
    name: 'Copenhagen Adduction',
    instructions:
      'Lie on your side with your top leg resting on a bench or a partner. Lift your hips so your body forms a straight line, supported on the top leg, and hold.',
    targetAreas: ['adductors', 'core'],
    modality: 'eccentric',
    // Counted, not clocked: the whole exercise is the tempo of each rep, and
    // a timer would just rush it.
    mode: 'reps',
    defaultDurationSec: 30,
    defaultReps: 6,
    side: 'per-side',
    purpose: 'Eccentric adductor strength — the groin injuries that come from high steps.',
    tips: 'Three seconds up, three seconds down. Start at level one even if it feels easy: long-length adductor loading is unforgiving, and the soreness arrives a day late.',
    levels: [
      'bottom knee bent, top leg on a low bench — shortest lever',
      'bottom leg straight, top leg on the bench at knee height',
      'bottom leg straight, top foot on a chair — full lever',
    ],
  },
  {
    id: 'couch-stretch',
    name: 'Couch Stretch',
    instructions:
      'Place one shin up a wall with the knee on a pad, the other foot planted in front. Tuck your pelvis under and lift your chest until the front of the hip opens.',
    targetAreas: ['hips', 'quads'],
    modality: 'static',
    defaultDurationSec: 60,
    side: 'per-side',
    purpose: 'Hip extension — the single highest-value position if you spend hours on a bike.',
  },
  {
    id: 'seated-ninety-ninety-lift',
    name: 'Seated 90/90 Active Lift',
    instructions:
      'Sit in the 90/90 position and lift the back shin off the floor without leaning. Hold at the top, lower slowly, and keep both sit bones down.',
    targetAreas: ['hips', 'glutes'],
    modality: 'activation',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'Turns passive rotation into rotation you can actually control.',
  },
  {
    id: 'pancake-fold',
    name: 'Pancake Fold',
    instructions:
      'Sit with legs wide and toes up. Hinge from the hips with a long spine and walk your hands forward. Breathe out at the end range instead of bouncing.',
    targetAreas: ['adductors', 'hamstrings'],
    modality: 'static',
    defaultDurationSec: 90,
    side: 'both',
    purpose: 'Adductor and hamstring length for wide stances near the wall.',
  },
  {
    id: 'eccentric-heel-drop',
    name: 'Eccentric Heel Drop',
    instructions:
      'Stand with the balls of your feet on a step. Rise on both legs, shift your weight to one, then lower that heel below the step as slowly as you can. Step back up with both.',
    targetAreas: ['calves', 'ankles'],
    modality: 'eccentric',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'The only work here that lengthens calf fascicles rather than borrowing range for an hour.',
    tips: 'Do the lowering on one leg and the lift on two. Add a backpack once bodyweight stops being hard.',
  },
  {
    id: 'loaded-dorsiflexion-hold',
    name: 'Loaded Dorsiflexion Hold',
    instructions:
      'In a half-kneeling position, drive the front knee as far past the toes as you can with the heel down, and hold there. Keep breathing rather than bracing.',
    targetAreas: ['ankles', 'calves'],
    modality: 'static',
    defaultDurationSec: 45,
    side: 'per-side',
    purpose: 'Ankle dorsiflexion held long enough to change it — the one flexibility variable worth maintaining for running.',
  },

  // ── End-range strength ─────────────────────────────────────────────────
  // Passive range you cannot produce force in is range you do not own. These
  // load the positions rather than visit them, which is why they belong in
  // their own sessions and not in a warm-up.
  {
    id: 'hip-cars',
    name: 'Hip CARs',
    instructions:
      'Stand tall, hold something for balance. Lift one knee as high as it will go, carry it out to the side, then rotate the heel up and sweep the leg behind you. Reverse the path. Move as slowly as you can control.',
    targetAreas: ['hips', 'glutes'],
    modality: 'dynamic',
    defaultDurationSec: 30,
    side: 'per-side',
    purpose: 'Joint prep at full active range — control, not effort.',
    tips: 'If the rest of your body has to move to get the leg round, you have left your own range. Shrink the circle.',
  },
  {
    id: 'ninety-ninety-liftoff',
    name: '90/90 Switch with Lift-Off',
    instructions:
      'Sit in 90/90, switch sides slowly, then lift the trailing leg a few centimetres off the floor and hold it there for three seconds before the next switch.',
    targetAreas: ['hips', 'glutes'],
    modality: 'isometric',
    defaultDurationSec: 60,
    side: 'both',
    purpose: 'Loads the rotators instead of just travelling through them.',
    tips: 'The lift is tiny and it should be hard. If it is easy you are pushing off the floor with the front leg.',
  },
  {
    id: 'frog-rock-liftoff',
    name: 'Frog Rock with Lift-Off',
    instructions:
      'Rock back into the frog, then take the weight into your hands and lift both knees a few centimetres off the floor. Hold three seconds, set down, rock forward and repeat.',
    targetAreas: ['hips', 'adductors'],
    modality: 'isometric',
    defaultDurationSec: 60,
    side: 'both',
    purpose: 'Active abduction at end range — the primer for frogging.',
    tips: 'A couple of centimetres is a real lift. Chasing height turns it into a hip shrug.',
  },
  {
    id: 'loaded-frog-pails-rails',
    name: 'Loaded Frog, PAILs and RAILs',
    instructions:
      'Settle into an end-range frog and let it soften for ninety seconds. Then ramp up over five seconds into a near-maximal push of the knees down into the floor and hold ten seconds. Release, then actively pull the knees apart and deeper for ten seconds. That pair is one cycle.',
    targetAreas: ['hips', 'adductors'],
    modality: 'pails-rails',
    defaultDurationSec: 130,
    side: 'both',
    purpose: 'The single most reliable way to convert passive frog range into range you can use.',
    tips: 'Breathe through both contractions. Cramping in the adductors during the pull is normal and is the point — ease off a little, do not stop.',
  },
  {
    id: 'cossack-eccentric',
    name: 'Supernova Cossack',
    instructions:
      'Cossack squat with a slow, deliberate lowering over three to four seconds, a three-second pause at the bottom, then stand back up. Keep the trailing foot flat if you can.',
    targetAreas: ['adductors', 'hips', 'quads'],
    modality: 'eccentric',
    mode: 'reps',
    defaultDurationSec: 45,
    defaultReps: 8,
    side: 'per-side',
    purpose: 'Adductor length under load — the frogging position, on one leg.',
    tips: 'Hold a light weight at your chest once bodyweight stops being hard. The pause at the bottom is the part that works.',
  },
  {
    id: 'straddle-liftoff',
    name: 'Straddle Star Lift-Offs',
    instructions:
      'Sit in a wide straddle with your hands on the floor in front. Press the heels down into the floor, then lift them a few centimetres and hold for three to five seconds.',
    targetAreas: ['adductors', 'hamstrings', 'hips'],
    modality: 'isometric',
    mode: 'reps',
    defaultDurationSec: 40,
    defaultReps: 6,
    side: 'both',
    purpose: 'Turns a passive straddle into one you can hold yourself in.',
    tips: 'Sit on a folded towel if your pelvis rolls back. Range you cannot lift out of is not range you have.',
  },
  {
    id: 'banded-hip-distraction',
    name: 'Banded Distraction Pry',
    instructions:
      'Loop a band high around the hip crease and step away until it pulls the joint back into the socket. Drop into a deep squat or frog and pry actively toward the positions that feel blocked.',
    targetAreas: ['hips', 'adductors'],
    modality: 'loaded',
    defaultDurationSec: 60,
    side: 'per-side',
    purpose: 'Access and comfort work. Not the stimulus — the thing that makes the stimulus reachable.',
    tips: 'If it pinches at the front of the hip, the band is too low or you are pushing past what the joint will give today.',
  },
  {
    id: 'frog-end-range-hold',
    name: 'Orbit Hold',
    instructions:
      'End-range frog, held with intent: actively pull yourself down into the position rather than hanging on the joint capsule.',
    targetAreas: ['hips', 'adductors'],
    modality: 'isometric',
    defaultDurationSec: 45,
    side: 'both',
    purpose: 'Accumulated time at end range, under your own tension.',
    tips: 'The difference between this and a passive frog is whether your muscles are working. If you could fall asleep in it, you are not doing it.',
  },
  {
    id: 'high-step-liftoff',
    name: 'High-Step Lift-Off',
    instructions:
      'Stand tall and lift one knee as high as it will go without leaning back or tucking the pelvis. Hold three to five seconds at the top, then lower under control.',
    targetAreas: ['hips', 'core'],
    modality: 'isometric',
    mode: 'reps',
    defaultDurationSec: 35,
    defaultReps: 5,
    side: 'per-side',
    purpose: 'Active hip flexion — what a rock-over actually asks for.',
    tips: 'Stand with your back against a wall to catch yourself leaning. The height drops a lot, and that lower number is the honest one.',
  },
  {
    id: 'hamstring-bridge-curl',
    name: 'Hamstring Bridge Curl',
    instructions:
      'Heels on a chair, bridge the hips up, then slowly walk or slide the heels away until you are nearly flat. Reset and repeat.',
    targetAreas: ['hamstrings', 'glutes'],
    modality: 'eccentric',
    mode: 'reps',
    defaultDurationSec: 45,
    defaultReps: 6,
    side: 'both',
    purpose: 'Eccentric hamstring strength in the position a heel hook loads.',
    tips: 'Keep the hips up the whole way out. When they drop, the set is over — count that rep and stop.',
  },
  {
    id: 'banded-external-rotation',
    name: 'Banded External Rotation',
    instructions:
      'Band around the ankles or above the knee. Stand on one leg and rotate the other thigh outward against the band, slowly, without letting the pelvis turn with it.',
    targetAreas: ['hips', 'glutes'],
    modality: 'loaded',
    mode: 'reps',
    defaultDurationSec: 40,
    defaultReps: 10,
    side: 'per-side',
    purpose: 'Rotator strength for drop knees and heel hooks.',
    tips: 'A hand on the wall and one on your hip: if the hip moves, lighten the band.',
  },
  {
    id: 'ankle-rocker-weighted',
    name: 'Ankle Rocker, Weighted Shift',
    instructions:
      'Wall ankle rocker, but shift your full weight onto the front leg as the knee travels past the toes, and let the back foot come off the floor.',
    targetAreas: ['ankles', 'calves'],
    modality: 'dynamic',
    mode: 'reps',
    defaultDurationSec: 40,
    defaultReps: 8,
    side: 'per-side',
    purpose: 'End-range dorsiflexion with load through it, rather than a gentle rock.',
    tips: 'Heel stays down. The moment it lifts, that was the end of your range and the rest was ankle roll.',
  },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);
