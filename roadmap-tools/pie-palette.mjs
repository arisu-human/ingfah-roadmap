// Pick 6 repo colours that are (a) easy to tell apart from EACH OTHER at 26px, and
// (b) still far enough from the status/type pastels not to read as progress.
const hex = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16))
const lin = c => { c/=255; return c<=.03928 ? c/12.92 : Math.pow((c+.055)/1.055,2.4) }
const lab = h => { let [r,g,b] = hex(h).map(lin).map(v=>v*100)
  let x=(r*.4124+g*.3576+b*.1805)/95.047, y=(r*.2126+g*.7152+b*.0722)/100,
      z=(r*.0193+g*.1192+b*.9505)/108.883
  const f = t => t>.008856 ? Math.cbrt(t) : 7.787*t+16/116
  return [116*f(y)-16, 500*(f(x)-f(y)), 200*(f(y)-f(z))] }
const d = (a,b) => { const A=lab(a), B=lab(b); return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]) }

const PASTEL = ['#afb8c1','#80ccff','#f2cc60','#ff9492','#ffb77c','#c297ff','#4ac26b',
                '#8fd0a0','#9dc2f0','#f0a8a8','#f2c295','#d8dee4']
const POOL = ['#1f4ea1','#0072B2','#004d7a','#005f73','#0e7490','#009E73','#1b7f3b','#3d6b1f',
              '#7a5c00','#b8860b','#E69F00','#D55E00','#aa2d00','#b3123c','#a11d5e','#CC79A7',
              '#7a1f5c','#6b2d8f','#5b3fa8','#123a7a','#0a2e0e','#8a3324','#4a6b00','#00695c']
const N = 6
let best = null
const pick = (start, cur) => {
  if (cur.length === N) {
    let mr = 1e9, mo = 1e9
    for (let i=0;i<N;i++) { for (let j=i+1;j<N;j++) mr = Math.min(mr, d(cur[i],cur[j]))
      for (const p of PASTEL) mo = Math.min(mo, d(cur[i],p)) }
    if (mo < 28) return
    if (!best || mr > best.mr) best = { mr, mo, set:[...cur] }
    return
  }
  for (let i=start;i<POOL.length;i++) pick(i+1, [...cur, POOL[i]])
}
pick(0, [])
console.log('best min repo-vs-repo :', best.mr.toFixed(1), '(was 38.7 with the dark set)')
console.log('     min vs pastel    :', best.mo.toFixed(1), '(floor 28, >30 = clearly different)')
console.log('palette:', best.set.join('  '))
