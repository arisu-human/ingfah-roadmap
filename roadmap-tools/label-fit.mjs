// Verifies the sprint label steps down instead of being clipped at both ends.
// No DOM: offsetWidth is modelled from the real CSS (10px uppercase, .4px tracking,
// 10px padding each side ~= 6.3px per char + 20).
const measure = t => Math.round(t.length * 6.3) + 20
const pretty = s => new Date(s + 'T00:00:00Z')
  .toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'UTC' })

export function pickLabel(w, from, to) {
  const days = Math.round((new Date(to) - new Date(from)) / 864e5) + 1
  const options = ['Sprint · ' + pretty(from) + ' to ' + pretty(to) + ' · ' + days + 'd',
                   'Sprint · ' + days + 'd', 'Sprint', '']
  for (const text of options) {
    if (!text) return '(hidden)'
    if (measure(text) <= w - 8) return text
  }
}

const from = '2026-08-16', to = '2026-08-29'
console.log('sprint 16 Aug to 29 Aug, by pane width:')
let bad = 0
for (const w of [400, 280, 240, 200, 160, 120, 90, 70, 50, 30, 10]) {
  const t = pickLabel(w, from, to)
  const fits = t === '(hidden)' || measure(t) <= w - 8
  if (!fits) bad++
  console.log(String(w).padStart(4) + 'px ->', JSON.stringify(t), fits ? '' : '  <-- STILL OVERFLOWS')
}
console.log('\nwidths where the label still overflows:', bad)
