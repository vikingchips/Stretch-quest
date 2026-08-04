import type { Exercise } from '../types';

export const EXERCISES: Exercise[] = [
  // ── Neck / shoulders / chest ────────────────────────────────────────────
  {
    id: 'neck-side-tilt',
    name: 'Neck Side Tilt',
    instructions:
      'Sit or stand tall. Tilt your ear toward your shoulder until you feel a stretch along the side of your neck. Let the opposite shoulder hang heavy.',
    targetAreas: ['neck'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🙂', accent: '#8b5cf6' },
    tips: 'For more depth, gently rest the hand of the tilting side on your head — never pull.',
  },
  {
    id: 'cross-body-shoulder',
    name: 'Cross-Body Shoulder Stretch',
    instructions:
      'Bring one arm straight across your chest. Use the other forearm to hug it closer until you feel the stretch in the back of your shoulder.',
    targetAreas: ['shoulders'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🤗', accent: '#8b5cf6' },
  },
  {
    id: 'overhead-triceps',
    name: 'Overhead Triceps Stretch',
    instructions:
      'Reach one arm overhead and drop the hand behind your neck. With the other hand, gently press the elbow back and down.',
    targetAreas: ['arms', 'shoulders'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '💪', accent: '#8b5cf6' },
  },
  {
    id: 'thread-the-needle',
    name: 'Thread the Needle',
    instructions:
      'From all fours, slide one arm under your chest with the palm up, lowering your shoulder and ear to the floor. Feel the stretch between your shoulder blades.',
    targetAreas: ['shoulders', 'back'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🪡', accent: '#8b5cf6' },
  },
  {
    id: 'wall-chest-opener',
    name: 'Wall Chest Opener',
    instructions:
      'Place your forearm against a wall or door frame with the elbow at shoulder height. Step forward and rotate your chest away until the front of your shoulder opens up.',
    targetAreas: ['chest', 'shoulders'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🚪', accent: '#8b5cf6' },
    tips: 'Great after a climbing session — climbers get tight in the chest from pulling.',
  },
  {
    id: 'eagle-arms',
    name: 'Eagle Arms',
    instructions:
      'Wrap one arm under the other in front of you, aiming to touch palms. Lift the elbows and push the forearms away to stretch the upper back and rear shoulders.',
    targetAreas: ['shoulders', 'back'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🦅', accent: '#8b5cf6' },
  },

  // ── Wrists / fingers (climbing gold) ────────────────────────────────────
  {
    id: 'wrist-flexor-stretch',
    name: 'Wrist Flexor Stretch',
    instructions:
      'Extend one arm with the palm up. With the other hand, gently pull the fingers back and down until you feel a stretch along the inside of your forearm.',
    targetAreas: ['wrists', 'arms'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🖐️', accent: '#f59e0b' },
    tips: 'The single most important stretch for climbers. Keep the elbow straight.',
  },
  {
    id: 'wrist-extensor-stretch',
    name: 'Wrist Extensor Stretch',
    instructions:
      'Extend one arm with the palm down and let the hand hang. Use the other hand to gently press the back of the hand toward you, stretching the top of the forearm.',
    targetAreas: ['wrists', 'arms'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🫱', accent: '#f59e0b' },
  },
  {
    id: 'prayer-stretch',
    name: 'Prayer Stretch',
    instructions:
      'Press your palms together in front of your chest, fingers pointing up. Slowly lower your hands while keeping the palms glued together until your wrists stretch.',
    targetAreas: ['wrists'],
    defaultDurationSec: 30,
    side: 'both',
    art: { kind: 'emoji', value: '🙏', accent: '#f59e0b' },
  },
  {
    id: 'finger-extensor-spread',
    name: 'Finger Extensor Spread',
    instructions:
      'Place a rubber band around your fingertips or simply spread your fingers as wide as possible against gentle resistance. Open and hold, then relax.',
    targetAreas: ['fingers'],
    defaultDurationSec: 30,
    side: 'both',
    art: { kind: 'emoji', value: '✋', accent: '#f59e0b' },
    tips: 'Antagonist work for crimping — do this after every climbing session.',
  },
  {
    id: 'wrist-circles',
    name: 'Wrist Circles',
    instructions:
      'Interlace your fingers and roll your wrists slowly through full circles in both directions. Keep the movement smooth and unhurried.',
    targetAreas: ['wrists'],
    defaultDurationSec: 30,
    side: 'both',
    art: { kind: 'emoji', value: '🔄', accent: '#f59e0b' },
  },

  // ── Back / core ─────────────────────────────────────────────────────────
  {
    id: 'cat-cow',
    name: 'Cat-Cow',
    instructions:
      'On all fours, alternate slowly between arching your back up like an angry cat and dipping it down while lifting your gaze. Move with your breath.',
    targetAreas: ['back', 'core'],
    defaultDurationSec: 40,
    side: 'both',
    art: { kind: 'emoji', value: '🐱', accent: '#10b981' },
  },
  {
    id: 'childs-pose',
    name: "Child's Pose",
    instructions:
      'Kneel, sit back on your heels and fold forward, reaching your arms out along the floor. Let your forehead rest down and breathe into your back.',
    targetAreas: ['back', 'hips', 'shoulders'],
    defaultDurationSec: 40,
    side: 'both',
    art: { kind: 'emoji', value: '🧎', accent: '#10b981' },
  },
  {
    id: 'cobra',
    name: 'Cobra',
    instructions:
      'Lie face down, hands under your shoulders. Press your chest up while keeping your hips on the floor, opening the front of your body.',
    targetAreas: ['core', 'back', 'chest'],
    defaultDurationSec: 30,
    side: 'both',
    art: { kind: 'emoji', value: '🐍', accent: '#10b981' },
  },
  {
    id: 'seated-spinal-twist',
    name: 'Seated Spinal Twist',
    instructions:
      'Sit with one leg extended, cross the other foot over that knee. Hug the raised knee and rotate your torso toward it, looking over your shoulder.',
    targetAreas: ['back', 'glutes', 'core'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🌀', accent: '#10b981' },
  },
  {
    id: 'standing-side-bend',
    name: 'Standing Side Bend',
    instructions:
      'Stand tall, reach one arm overhead and lean sideways away from it. Feel the stretch open the whole side of your torso from hip to fingertips.',
    targetAreas: ['core', 'back'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🌙', accent: '#10b981' },
  },
  {
    id: 'thoracic-wall-extension',
    name: 'Thoracic Wall Extension',
    instructions:
      'Face a wall at arm’s length, place both hands on it and walk them up. Drop your chest through your arms, keeping your spine long. Opens the upper back for overhead reaches.',
    targetAreas: ['back', 'shoulders'],
    defaultDurationSec: 40,
    side: 'both',
    art: { kind: 'emoji', value: '🧱', accent: '#10b981' },
  },

  // ── Hips / glutes ───────────────────────────────────────────────────────
  {
    id: 'pigeon-pose',
    name: 'Pigeon Pose',
    instructions:
      'From all fours, bring one knee forward behind your wrist with the shin angled across. Extend the other leg back and settle your hips down, folding forward if comfortable.',
    targetAreas: ['hips', 'glutes'],
    defaultDurationSec: 45,
    side: 'per-side',
    art: { kind: 'emoji', value: '🕊️', accent: '#ec4899' },
    tips: 'The classic climber hip opener. Use a cushion under the hip if it hovers.',
  },
  {
    id: 'butterfly',
    name: 'Butterfly Stretch',
    instructions:
      'Sit with the soles of your feet together and knees dropped out wide. Hold your feet, sit tall, and gently lean forward from the hips.',
    targetAreas: ['hips', 'glutes'],
    defaultDurationSec: 40,
    side: 'both',
    art: { kind: 'emoji', value: '🦋', accent: '#ec4899' },
  },
  {
    id: 'ninety-ninety',
    name: '90/90 Hip Switch',
    instructions:
      'Sit with your front leg bent 90° in front and the rear leg bent 90° to the side. Keep your chest tall and lean over the front shin, then switch sides slowly.',
    targetAreas: ['hips', 'glutes'],
    defaultDurationSec: 40,
    side: 'per-side',
    art: { kind: 'emoji', value: '📐', accent: '#ec4899' },
  },
  {
    id: 'deep-squat-hold',
    name: 'Deep Squat Hold',
    instructions:
      'Squat as low as you can with heels down and feet slightly turned out. Use your elbows to press your knees outward and keep your chest lifted.',
    targetAreas: ['hips', 'ankles', 'glutes'],
    defaultDurationSec: 45,
    side: 'both',
    art: { kind: 'emoji', value: '🏋️', accent: '#ec4899' },
    tips: 'Essential for high steps and rock-overs on the wall.',
  },
  {
    id: 'figure-four',
    name: 'Figure-Four Stretch',
    instructions:
      'Lie on your back, cross one ankle over the opposite knee, and pull that thigh toward your chest until the outside of your hip stretches.',
    targetAreas: ['glutes', 'hips'],
    defaultDurationSec: 40,
    side: 'per-side',
    art: { kind: 'emoji', value: '4️⃣', accent: '#ec4899' },
  },
  {
    id: 'frog-pose',
    name: 'Frog Pose',
    instructions:
      'From all fours, widen your knees as far as comfortable with feet in line with the knees. Sink your hips back and down, resting on your forearms.',
    targetAreas: ['hips'],
    defaultDurationSec: 45,
    side: 'both',
    art: { kind: 'emoji', value: '🐸', accent: '#ec4899' },
  },
  {
    id: 'lizard-lunge',
    name: 'Lizard Lunge',
    instructions:
      'Step one foot outside your hands in a low lunge. Sink your hips forward and down; drop to forearms for more depth. Keep the back leg long.',
    targetAreas: ['hips', 'quads'],
    defaultDurationSec: 40,
    side: 'per-side',
    art: { kind: 'emoji', value: '🦎', accent: '#ec4899' },
  },

  // ── Legs / feet (running gold) ──────────────────────────────────────────
  {
    id: 'standing-hamstring',
    name: 'Standing Hamstring Stretch',
    instructions:
      'Place one heel on a low step with the leg straight. Hinge forward from the hips with a flat back until the back of your thigh stretches.',
    targetAreas: ['hamstrings'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🦵', accent: '#3b82f6' },
  },
  {
    id: 'lying-hamstring',
    name: 'Lying Hamstring Stretch',
    instructions:
      'Lie on your back and raise one straight leg. Hold behind the thigh or calf (or use a towel) and draw the leg gently toward you.',
    targetAreas: ['hamstrings', 'calves'],
    defaultDurationSec: 45,
    side: 'per-side',
    art: { kind: 'emoji', value: '🛏️', accent: '#3b82f6' },
  },
  {
    id: 'standing-quad',
    name: 'Standing Quad Stretch',
    instructions:
      'Stand on one leg (hold something for balance), grab your other ankle behind you and draw the heel toward your glutes. Keep knees together and hips square.',
    targetAreas: ['quads'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🦩', accent: '#3b82f6' },
  },
  {
    id: 'kneeling-hip-flexor',
    name: 'Kneeling Hip-Flexor Lunge',
    instructions:
      'Kneel on one knee in a lunge. Tuck your pelvis, squeeze the glute of the kneeling side and shift forward until the front of that hip stretches.',
    targetAreas: ['hips', 'quads'],
    defaultDurationSec: 45,
    side: 'per-side',
    art: { kind: 'emoji', value: '🧎‍♂️', accent: '#3b82f6' },
    tips: 'Runners live here — tight hip flexors steal your stride length.',
  },
  {
    id: 'straight-leg-calf',
    name: 'Straight-Leg Calf Stretch',
    instructions:
      'Step one foot back, press the heel into the floor and keep that leg straight while leaning into a wall. Stretch the upper calf.',
    targetAreas: ['calves'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🧱', accent: '#3b82f6' },
  },
  {
    id: 'bent-knee-calf',
    name: 'Bent-Knee Calf Stretch',
    instructions:
      'Same wall position as the straight-leg version, but bend the back knee slightly while keeping the heel down. This targets the deeper soleus muscle.',
    targetAreas: ['calves', 'ankles'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '📏', accent: '#3b82f6' },
  },
  {
    id: 'itband-crossover',
    name: 'IT-Band Cross-Over',
    instructions:
      'Cross one leg behind the other and lean your hips toward the side of the back leg, reaching the same-side arm overhead. Stretch along the outer hip and thigh.',
    targetAreas: ['hips', 'quads'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '🤸', accent: '#3b82f6' },
  },
  {
    id: 'plantar-toe-stretch',
    name: 'Plantar & Toe Stretch',
    instructions:
      'Kneel with your toes tucked under and slowly sit back onto your heels. Feel the stretch through the soles of your feet and toes.',
    targetAreas: ['feet', 'ankles'],
    defaultDurationSec: 30,
    side: 'both',
    art: { kind: 'emoji', value: '🦶', accent: '#3b82f6' },
  },
  {
    id: 'ankle-circles',
    name: 'Ankle Circles',
    instructions:
      'Lift one foot and draw slow, full circles with your toes — both directions. Keep the movement controlled through the whole range.',
    targetAreas: ['ankles', 'feet'],
    defaultDurationSec: 30,
    side: 'per-side',
    art: { kind: 'emoji', value: '⭕', accent: '#3b82f6' },
  },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);
