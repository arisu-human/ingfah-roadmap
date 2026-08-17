// A closed copy in another repo must not pin an open release's due date, and the whole
// picture must be unchanged for everything that has no closed twin.
import { build, inWindow, raw } from './logic.mjs'
const rows = build(raw())
const byTitle = {}
for (const m of raw()) (byTitle[m.title] ||= []).push(m)
let pinned = 0, checked = 0
for (const r of rows) {
  const ms = byTitle[r.title] || []
  const open = ms.filter(m => !m.isClosed)
  if (!open.length) continue
  checked++
  const earliestOpen = open.map(m => (m.dueOn||'').slice(0,10)).sort()[0]
  if (r.due !== earliestOpen) { pinned++
    console.log('PINNED', r.name, 'shows', r.due, 'but open copies say', earliestOpen) }
}
console.log('open releases checked:', checked)
console.log('whose due date is pinned by a closed copy:', pinned)
console.log('total releases built:', rows.length, '| visible:', rows.filter(inWindow).length)
