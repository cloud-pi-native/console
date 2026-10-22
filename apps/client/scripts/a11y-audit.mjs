#!/usr/bin/env node
/**
 * Static accessibility audit for the Vue client.
 *
 * Dependency-free on purpose: `pnpm add` cannot run in this workspace (the
 * pnpm store is pinned by an older install), and a browser-based axe run is not
 * available in CI. The checks below are the structural invariants that a
 * template can be audited for without rendering, and they are ratcheted against
 * docs/client/a11y-baseline.json so the count can only go down.
 *
 * DOM-level behaviour (focus order, live announcements) is covered by the
 * component tests, not by this script.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const clientDir = resolve(scriptDir, '..')

function findRepoRoot(start) {
  let current = start
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current
    current = dirname(current)
  }
  throw new Error(`Racine du dépôt introuvable depuis ${start}`)
}

const repoRoot = findRepoRoot(clientDir)
// Kept inside apps/client so the baseline is present in the Docker build context.
const baselinePath = join(clientDir, 'a11y-baseline.json')
const reportDir = join(repoRoot, 'docs/client')
const args = new Set(process.argv.slice(2))
const updateBaseline = args.has('--update-baseline')
const writeReport = args.has('--write-report')

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage'].includes(entry.name)) return []
      return sourceFiles(full)
    }
    return entry.name.endsWith('.vue') ? [full] : []
  })
}

const vueFiles = sourceFiles(join(clientDir, 'src')).sort()

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length
}

function blockMatches(source, pattern) {
  return [...source.matchAll(pattern)].map(match => ({
    block: match[0],
    index: match.index ?? 0,
  }))
}

/** Files whose <h1> is rendered by a child component or which are pure outlets. */
const HEADING_ALLOWLIST = new Set([
  'src/views/admin/AdminCluster.vue',
  'src/views/admin/AdminServiceChain.vue',
  'src/views/admin/DsoAdmin.vue',
  'src/views/profile/ProfileWrapper.vue',
])

const rules = [
  {
    id: 'icon-only-without-name',
    severity: 'error',
    message: 'Bouton icône sans nom accessible : ajouter aria-label.',
    check(file, source) {
      return blockMatches(source, /<DsfrButton[\s\S]*?\/>/g)
        .filter(({ block }) => /(?:^|\s)icon-only(?:\s|>)/.test(block) && !/\s:?aria-label=/.test(block))
        .map(({ block, index }) => ({ line: lineAt(source, index), snippet: block.split('\n')[0].trim() }))
    },
  },
  {
    id: 'image-without-alt',
    severity: 'error',
    message: 'Image sans attribut alt.',
    check(file, source) {
      return [...source.matchAll(/<img\b[^>]*>/g)]
        .filter(match => !/\salt=/.test(match[0]))
        .map(match => ({ line: lineAt(source, match.index ?? 0), snippet: match[0].slice(0, 80) }))
    },
  },
  {
    id: 'click-on-non-interactive',
    severity: 'error',
    message: 'Gestionnaire de clic sur un élément non interactif : utiliser <button>/<a> ou ajouter role et tabindex.',
    check(file, source) {
      const findings = []
      const tagPattern = /<(div|span|li|td|tr|p|code|v-icon)\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/g
      for (const match of source.matchAll(tagPattern)) {
        const attributes = match[2] ?? ''
        if (!/@click=/.test(attributes)) continue
        if (/\srole=/.test(attributes) || /\stabindex=/.test(attributes)) continue
        findings.push({ line: lineAt(source, match.index ?? 0), snippet: match[0].slice(0, 100) })
      }
      return findings
    },
  },
  {
    id: 'positive-tabindex',
    severity: 'error',
    message: 'tabindex positif : il casse l’ordre de tabulation naturel.',
    check(file, source) {
      return [...source.matchAll(/tabindex="([1-9]\d*)"/g)]
        .map(match => ({ line: lineAt(source, match.index ?? 0), snippet: match[0] }))
    },
  },
  {
    id: 'view-without-h1',
    severity: 'error',
    message: 'Vue sans titre de niveau 1.',
    check(file, source) {
      const relativePath = relative(clientDir, file).replaceAll('\\', '/')
      if (!relativePath.startsWith('src/views/')) return []
      if (HEADING_ALLOWLIST.has(relativePath)) return []
      if (/<h1\b/.test(source) || /<PageHeading\b/.test(source)) return []
      return [{ line: 1, snippet: relativePath }]
    },
  },
  {
    id: 'multiple-h1',
    severity: 'error',
    message: 'Plusieurs titres de niveau 1 dans le même fichier.',
    check(file, source) {
      const count = [...source.matchAll(/<h1\b/g)].length
      if (count <= 1) return []
      return [{ line: lineAt(source, source.search(/<h1\b/)), snippet: `${count} occurrences` }]
    },
  },
  {
    id: 'native-button-without-type',
    severity: 'warning',
    message: 'Bouton natif sans attribut type (submit implicite dans un formulaire).',
    check(file, source) {
      return [...source.matchAll(/<button\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)]
        .filter(match => !/\s:?type=/.test(match[1] ?? ''))
        .map(match => ({ line: lineAt(source, match.index ?? 0), snippet: match[0].slice(0, 80) }))
    },
  },
  {
    id: 'input-without-label',
    severity: 'warning',
    message: 'Champ de saisie sans label ni aria-label.',
    check(file, source) {
      return blockMatches(source, /<Dsfr(?:Input|InputGroup|Select|Checkbox)\b[\s\S]*?\/>/g)
        .filter(({ block }) => !/\s:?label=/.test(block) && !/\s:?aria-label=/.test(block))
        .map(({ block, index }) => ({ line: lineAt(source, index), snippet: block.split('\n')[0].trim() }))
    },
  },
  {
    id: 'page-shell-missing-landmarks',
    severity: 'error',
    message: 'La coque applicative doit exposer un lien d’évitement, un <main id="content"> et un <footer id="footer">.',
    check(file, source) {
      const relativePath = relative(clientDir, file).replaceAll('\\', '/')
      if (relativePath !== 'src/App.vue') return []
      const findings = []
      const hasSkipLink = /href="#content"/.test(source)
        || (/<DsfrSkipLinks\b/.test(source) && /id:\s*['"]content['"]/.test(source))
      if (!hasSkipLink) findings.push({ line: 1, snippet: 'lien d’évitement #content absent' })
      if (!/<main\s[^>]*id="content"/.test(source)) findings.push({ line: 1, snippet: '<main id="content"> absent' })
      if (!/<DsfrFooter\s[^>]*id="footer"/.test(source)) findings.push({ line: 1, snippet: '<DsfrFooter id="footer"> absent' })
      return findings
    },
  },
  {
    id: 'html-lang',
    severity: 'error',
    message: 'index.html doit déclarer la langue de la page.',
    check(file, source) {
      const relativePath = relative(clientDir, file).replaceAll('\\', '/')
      if (relativePath !== 'index.html') return []
      return /<html[^>]*\slang="[a-z]{2}/.test(source) ? [] : [{ line: 1, snippet: '<html lang> absent' }]
    },
  },
]

function audit() {
  const findings = []
  const htmlIndex = join(clientDir, 'index.html')
  const audited = [...vueFiles, htmlIndex]
  for (const file of audited) {
    const source = readFileSync(file, 'utf8')
    for (const rule of rules) {
      for (const finding of rule.check(file, source)) {
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          file: relative(repoRoot, file).replaceAll('\\', '/'),
          line: finding.line,
          message: rule.message,
          snippet: finding.snippet,
        })
      }
    }
  }
  return findings
}

function countsByRule(findings) {
  return findings.reduce((accumulator, finding) => {
    accumulator[finding.rule] = (accumulator[finding.rule] ?? 0) + 1
    return accumulator
  }, {})
}

const findings = audit()
const counts = countsByRule(findings)
const errors = findings.filter(finding => finding.severity === 'error')

function printSummary() {
  console.log(`Audit accessibilité statique — ${vueFiles.length} fichiers .vue + index.html`)
  if (!findings.length) {
    console.log('Aucune violation détectée.')
    return
  }
  for (const [rule, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const severity = rules.find(candidate => candidate.id === rule)?.severity ?? 'warning'
    console.log(`  ${severity === 'error' ? '✗' : '⚠'} ${rule}: ${count}`)
  }
  const worst = findings.slice(0, 40)
  for (const finding of worst) {
    console.log(`    ${finding.file}:${finding.line} [${finding.rule}] ${finding.snippet}`)
  }
  if (findings.length > worst.length) console.log(`    … ${findings.length - worst.length} autres`)
}

if (updateBaseline) {
  const baseline = {
    generatedAt: new Date().toISOString(),
    total: findings.length,
    errors: errors.length,
    counts,
  }
  mkdirSync(dirname(baselinePath), { recursive: true })
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(`Baseline écrite : ${relative(repoRoot, baselinePath)} (${findings.length} violations, ${errors.length} erreurs)`)
}

if (writeReport) {
  mkdirSync(reportDir, { recursive: true })
  const payload = {
    generatedAt: new Date().toISOString(),
    filesAudited: vueFiles.length + 1,
    total: findings.length,
    errors: errors.length,
    counts,
    findings,
  }
  writeFileSync(join(reportDir, 'a11y-report.json'), `${JSON.stringify(payload, null, 2)}\n`)
  const escapedPipe = String.raw`\|`
  const lines = [
    '# Rapport d’audit accessibilité statique',
    '',
    `Généré le ${payload.generatedAt} — ${payload.filesAudited} fichiers, ${payload.total} violations, ${payload.errors} erreurs.`,
    '',
    '| Règle | Sévérité | Occurrences |',
    '| --- | --- | --- |',
    ...Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => {
        const severity = rules.find(candidate => candidate.id === rule)?.severity ?? 'warning'
        return `| \`${rule}\` | ${severity} | ${count} |`
      }),
    '',
    '## Détail',
    '',
    '| Fichier | Ligne | Règle | Extrait |',
    '| --- | --- | --- | --- |',
    ...findings.map(finding =>
      `| \`${finding.file}\` | ${finding.line} | \`${finding.rule}\` | \`${finding.snippet.replaceAll('|', escapedPipe)}\` |`,
    ),
    '',
  ]
  writeFileSync(join(reportDir, 'a11y-report.md'), `${lines.join('\n')}\n`)
  console.log(`Rapport écrit : ${relative(repoRoot, join(reportDir, 'a11y-report.md'))}`)
}

printSummary()

if (!updateBaseline) {
  if (!existsSync(baselinePath)) {
    console.error(`\nBaseline absente : ${relative(repoRoot, baselinePath)}. Lancez \`pnpm a11y:audit:update\`.`)
    process.exit(1)
  }
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const regressions = Object.entries(counts)
    .filter(([rule, count]) => count > (baseline.counts?.[rule] ?? 0))
    .map(([rule, count]) => `${rule}: ${baseline.counts?.[rule] ?? 0} → ${count}`)
  if (regressions.length) {
    console.error('\nRégression accessibilité détectée :')
    for (const regression of regressions) console.error(`  - ${regression}`)
    process.exit(1)
  }
  console.log(`\nRatchet respecté (baseline : ${baseline.total} violations, ${baseline.errors} erreurs).`)
}
