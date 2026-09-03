// Regenerates src/lib/partner-agreement-content.ts from plain-text exports of
// the agreement .docx files, so the legal text is never altered by hand.
//
//   textutil -convert txt -output /tmp/agreement-en.txt "Provider Partnership Agreement (English).docx"
//   textutil -convert txt -output /tmp/agreement-fr.txt "Provider Partnership Agreement (French).docx"
//   node scripts/generate-agreement-content.mjs /tmp/agreement-en.txt /tmp/agreement-fr.txt
//
// Then bump AGREEMENT_VERSION in src/lib/partner-agreement.ts.
import { readFileSync, writeFileSync } from 'node:fs'

const [enPath, frPath] = process.argv.slice(2)
if (!enPath || !frPath) { console.error('usage: node scripts/generate-agreement-content.mjs <en.txt> <fr.txt>'); process.exit(1) }

// Standalone sub-headings that carry no numbering (§12's cure/termination).
const BARE_HEADINGS = new Set([
  'Opportunity to Cure',
  'Immediate Suspension or Termination',
  'Possibilité de remédier au manquement',
  'Suspension ou résiliation immédiate',
])
// The signature block is rendered from data (AgreementSignatures), never from
// the transcribed text — cut everything from the entity line on.
const SIGNATURE_STARTS = [/^Palmera Services LLC$/i, /^PALMERA SERVICES LLC$/, /^LE PARTENAIRE$/, /^Provider Partner$/]

function parse(path) {
  const lines = readFileSync(path, 'utf8').split('\n').map((l) => l.replace(/ /g, ' ').trimEnd())
  const title = lines[0].trim()
  const intro = []
  const sections = []
  let cur = null
  let list = null
  const flushList = () => { if (list) { (cur ? cur.blocks : intro).push({ kind: 'ul', items: list }); list = null } }
  const push = (block) => { flushList(); (cur ? cur.blocks : intro).push(block) }

  for (const raw of lines.slice(1)) {
    const line = raw.trim()
    if (!line) continue
    if (/^(Effective Date|Date d’entrée en vigueur)/.test(line)) continue
    if (SIGNATURE_STARTS.some((re) => re.test(line))) break
    if (/^\d+\.\s+\S/.test(line) && !/^\d+\.\d/.test(line)) {
      flushList()
      cur = { heading: line, blocks: [] }
      sections.push(cur)
      continue
    }
    if (/^\t*•\t?/.test(raw) || /^•/.test(line)) {
      const item = line.replace(/^•\s*/, '').trim()
      if (!list) list = []
      list.push(item)
      continue
    }
    if (/^\d+\.\d+\s/.test(line) || BARE_HEADINGS.has(line)) { push({ kind: 'h', text: line }); continue }
    push({ kind: 'p', text: line })
  }
  flushList()
  return { title, intro, sections }
}

const content = { en: parse(enPath), fr: parse(frPath) }
const out = `// AUTO-GENERATED — do not hand-edit.
// Transcribed from:
//   Provider Partnership Agreement (English).docx
//   Provider Partnership Agreement (French).docx
// Regenerate with scripts/generate-agreement-content.mjs, so the legal text is
// never altered by hand. When the agreement changes, re-run the generator and
// bump AGREEMENT_VERSION.
import type { AgreementContent, AgreementLocale } from './partner-agreement'

export const AGREEMENT_CONTENT: Record<AgreementLocale, AgreementContent> = ${JSON.stringify(content, null, 2)}
`
writeFileSync('src/lib/partner-agreement-content.ts', out)
const count = (c) => c.sections.length
console.log(`Wrote src/lib/partner-agreement-content.ts — en: ${count(content.en)} sections, fr: ${count(content.fr)} sections`)
