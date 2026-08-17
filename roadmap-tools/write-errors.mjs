// Every way a due-date write can fail must produce a visible message, never a silent no-op.
// Pulls the real setDue out of index.html and runs it against stubbed GitHub replies.
import fs from 'fs'
const html = fs.readFileSync('ingfah-roadmap/index.html', 'utf8')
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
const src = js.match(/async function setDue[\s\S]*?\n\}/)[0]

const make = reply => {
  globalThis.fetch = async () => {
    if (reply.throw) throw new Error(reply.throw)
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body || {} }
  }
  return new Function('OWNER', 'token', 'return ' + src.replace(/^async function setDue/, 'async function'))
    ('100x-fi', () => 'ghp_x')
}

const ref = { repo:'zai-backend', number:59, dueOn:'2026-08-18T00:00:00Z' }
const cases = [
  ['happy path',              { status:200, body:{ due_on:'2026-08-21T00:00:00Z' } }, null],
  ['no write access (404)',   { status:404, body:{ message:'Not Found' } },            'cannot change'],
  ['forbidden (403)',         { status:403, body:{ message:'Forbidden' } },            'cannot change'],
  ['validation error (422)',  { status:422, body:{ message:'Validation Failed' } },    'HTTP 422'],
  ['network died',            { throw:'Failed to fetch' },                             'never reached GitHub'],
  ['200 but date not saved',  { status:200, body:{ due_on:'2026-08-18T00:00:00Z' } },  'came back as 2026-08-18'],
  ['200 but no date at all',  { status:200, body:{} },                                 'came back as empty'],
]
let bad = 0
for (const [name, reply, expect] of cases) {
  const setDue = make(reply)
  let err = null
  try { await setDue(ref, '2026-08-21', null) } catch (e) { err = e.message }
  const ok = expect === null ? err === null : (err && err.includes(expect))
  if (!ok) bad++
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name.padEnd(24) + (err ? '-> ' + err.slice(0, 78) : '-> saved'))
}
// the title check too
const setDue = make({ status:200, body:{ due_on:'2026-08-21T00:00:00Z', title:'wrong title' } })
let err = null
try { await setDue(ref, '2026-08-21', '20260821 X') } catch (e) { err = e.message }
const ok = err && err.includes('title came back')
if (!ok) bad++
console.log((ok ? 'PASS' : 'FAIL') + '  ' + 'rename did not stick'.padEnd(24) + '-> ' + (err || 'saved').slice(0, 78))
console.log('\nfailures that would still be silent:', bad)
process.exit(bad ? 1 : 0)
