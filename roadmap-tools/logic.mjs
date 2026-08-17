// Loads the real build()/inWindow from index.html so tests run the shipped code, not a copy.
import fs from 'fs'
const html = fs.readFileSync(new URL('../ingfah-roadmap/index.html', import.meta.url), 'utf8')
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
let src = js.slice(js.indexOf('const OWNER'), js.indexOf('const STATE_LABEL'))
src = src.replace("localStorage.getItem('ghToken') || ''", "''")
         .replace('const $ = id => document.getElementById(id)', 'const $ = () => ({})')
const exp = ['build','inWindow','BOARD','STATUS_SHORT','STATUS_COLOR','TYPE_COLOR',
             'REPO_COLOR','REPO_SHORT','DONE_FIRST_KEYS','pretty']
const mod = new Function(src + '\nreturn {' + exp.join(',') + '}')()
export const { build, inWindow, BOARD, STATUS_SHORT, STATUS_COLOR, TYPE_COLOR,
               REPO_COLOR, REPO_SHORT, DONE_FIRST_KEYS, pretty } = mod
export const raw = () => fs.readFileSync(new URL('raw.ndjson', import.meta.url), 'utf8')
  .trim().split('\n').map(JSON.parse)
