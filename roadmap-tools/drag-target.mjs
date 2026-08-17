// Which releases have a bar whose right edge is NOT the due date? Dragging those looks
// like it did nothing: the write lands, but the bar redraws in exactly the same place.
import { build, inWindow, raw, pretty } from './logic.mjs'
const rows = build(raw()).filter(inWindow)
const stuck = rows.filter(r => r.late && r.lastDone > r.due)
console.log('visible releases:', rows.length)
console.log('bars whose right edge is lastDone, not due:', stuck.length, '\n')
for (const r of stuck) console.log('  ' + r.name.slice(0,40).padEnd(40),
  'due', r.due, '| bar ends', r.barEnd, '| gap', Math.round((new Date(r.barEnd)-new Date(r.due))/864e5)+'d',
  '|', r.state)
console.log('\nof those, still open (so draggable):', stuck.filter(r => r.state !== 'closed').length)
