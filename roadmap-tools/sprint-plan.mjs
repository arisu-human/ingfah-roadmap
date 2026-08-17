// The "This Sprint" rules, run against the shipped code and real data.
import fs from 'fs'
const html = fs.readFileSync(new URL('../ingfah-roadmap/index.html', import.meta.url), 'utf8')
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
let src = js.slice(js.indexOf('const OWNER'), js.indexOf('const STATE_LABEL'))
src = src.replace("localStorage.getItem('ghToken') || ''", "''")
         .replace('const $ = id => document.getElementById(id)', 'const $ = () => ({})')
// the planning block is already inside that slice
src = src.replace(/try \{ thisSprint = new Set\(JSON\.parse[^\n]*\n/, '')
src = "const plus=(d,n)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);"
    + "return x.toISOString().slice(0,10)};let sprint=null;" + src
const M = new Function('localStorage', 'HOLIDAYS_UNUSED', src +
  '\nreturn {build, inWindow, applyPlan, nextWorkday, isWorkday, plannedStart,' +
  ' set thisSprint(v){thisSprint=v}, get thisSprint(){return thisSprint},' +
  ' set sprint(v){sprint=v}, get sprint(){return sprint}, HOLIDAYS}')(
    { getItem:()=>null, setItem:()=>{} })

const raw = fs.readFileSync(new URL('raw.ndjson', import.meta.url), 'utf8')
  .trim().split('\n').map(JSON.parse)

console.log('-- next working day skips weekends and Thai holidays --')
for (const [from, inc] of [['2026-08-14',false],['2026-08-15',true],['2026-08-11',true],
                           ['2026-08-29',false],['2026-10-12',false],['2026-12-30',false]]) {
  const got = M.nextWorkday(from, inc)
  const why = M.HOLIDAYS.has(got) ? 'HOLIDAY!' : (new Date(got+'T00:00:00Z').getUTCDay()%6===0 ? 'WEEKEND!' : 'ok')
  console.log('  from', from, inc?'(incl)':'(excl)', '->', got,
    new Date(got+'T00:00:00Z').toUTCString().slice(0,3), why)
}

const rows = M.build(raw).filter(M.inWindow)
const unstarted = rows.filter(r => !r.startedAt && r.state !== 'closed')
const started   = rows.filter(r => r.startedAt && r.state !== 'closed')
console.log('\nvisible: ' + rows.length + ' | unstarted ' + unstarted.length + ' | started ' + started.length)

M.sprint = { from:'2026-08-17', to:'2026-08-28' }
const pick = unstarted.slice(0, 3).map(r => r.title)

M.thisSprint = new Set(); M.applyPlan(rows)
const before = new Map(rows.map(r => [r.title, r.start]))
M.thisSprint = new Set(pick); M.applyPlan(rows)

console.log('\n-- unstarted, TICKED: must start now --')
for (const t of pick) { const r = rows.find(x=>x.title===t)
  console.log('  ' + r.name.slice(0,34).padEnd(34), before.get(t), '->', r.start, r.planned?'(planned)':'') }
console.log('\n-- unstarted, UNTICKED: first working day after the sprint (28 Aug is a Fri) --')
for (const r of unstarted.filter(r=>!pick.includes(r.title)).slice(0,3))
  console.log('  ' + r.name.slice(0,34).padEnd(34), '->', r.start)

console.log('\n-- started releases must NOT move, ticked or not --')
let moved = 0
M.thisSprint = new Set(rows.map(r=>r.title)); M.applyPlan(rows)
for (const r of started) if (r.start !== r.startedAt) { moved++; console.log('  MOVED', r.name, r.start, '!=', r.startedAt) }
console.log('  started releases whose start moved:', moved)
let bad = 0
for (const r of rows) if (r.barEnd < r.barStart) { bad++; console.log('  BACKWARDS BAR', r.name) }
console.log('  backwards bars:', bad)
process.exit(moved + bad ? 1 : 0)
