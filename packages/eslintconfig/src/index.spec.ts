import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configFile = join(__dirname, 'index.js')

// ponytail: spin up one ESLint instance per test for isolation; cheap enough at this scale.
async function formatText(input: string, filePath: string): Promise<string> {
  const eslint = new ESLint({ overrideConfigFile: configFile, fix: true, cwd: __dirname })
  const [result] = await eslint.lintText(input, { filePath })
  if (result.fatalErrorCount > 0) {
    throw new Error(`fatal lint error: ${JSON.stringify(result.messages)}`)
  }
  return result.output ?? input
}

describe('eslint-config formatter (markdown + json)', () => {
  describe('markdown list normalization', () => {
    it('rewrites * bullets to - per CommonMark style', async () => {
      const out = await formatText('# Title\n\n* a\n* b\n', 'doc.md')
      expect(out).toContain('- a\n- b')
      expect(out).not.toContain('* a')
    })

    it('collapses 3+ blank lines to one', async () => {
      const out = await formatText('# T\n\n\n\nbody\n', 'doc.md')
      expect(out).toBe('# T\n\nbody\n')
    })

    it('trims trailing whitespace on each line', async () => {
      const out = await formatText('text   \nmore\t\n', 'doc.md')
      expect(out).toBe('text\nmore\n')
    })
  })

  describe('idempotency (re-run yields identical output)', () => {
    it('is stable on markdown', async () => {
      const input = '# Title\n\n- a\n- b\n\ntext\n'
      const once = await formatText(input, 'doc.md')
      const twice = await formatText(once, 'doc.md')
      expect(twice).toBe(once)
    })

    it('is stable on json', async () => {
      const input = '{\n  "a": 1,\n  "b": 2\n}\n'
      const once = await formatText(input, 'data.json')
      const twice = await formatText(once, 'data.json')
      expect(twice).toBe(once)
    })
  })

  describe('json formatting', () => {
    // ponytail: eslint-plugin-format's prettier json path normalizes inline spacing
    // and ensures a trailing newline but does NOT expand objects across lines
    // (verified empirically: wide JSON stays single-line). Assert the real output.
    it('normalizes spacing and adds a trailing newline', async () => {
      const input = '{"a":1,"b":2}'
      const out = await formatText(input, 'data.json')
      expect(out.trimEnd()).toBe('{ "a": 1, "b": 2 }')
      expect(out.endsWith('\n')).toBe(true)
    })

    it('does not mangle valid json content', async () => {
      const input = '{\n  "nested": { "x": [1, 2, 3] }\n}\n'
      const out = await formatText(input, 'data.json')
      expect(JSON.parse(out)).toEqual({ nested: { x: [1, 2, 3] } })
    })
  })

  describe('extension coverage (jsonc already served by json formatter)', () => {
    it('normalizes .jsonc spacing while preserving comments', async () => {
      const input = '{\n  // keep me\n  "a" :1 , "b":2 }\n'
      const out = await formatText(input, 'data.jsonc')
      // The json formatter's prettier parser keeps comments AND normalizes spacing,
      // so .jsonc needs no separate formatter (correcting the parent's misnomer comment).
      expect(out).toContain('// keep me')
      expect(out).toContain('"a": 1,')
      expect(out.trimEnd()).toContain('"a": 1, "b": 2')
    })
  })

  describe('performance (must not add meaningful latency to the dev pipeline)', () => {
    it('formats 200 mixed files within a tight budget', async () => {
      // ponytail: single shared ESLint instance, real formatter cost only.
      const eslint = new ESLint({ overrideConfigFile: configFile, fix: true, cwd: __dirname })
      const md = '# T\n\n* a\n* b\n  \ntext  \n'
      const json = '{"alpha":1,"beta":2}'
      const files = Array.from({ length: 200 }, (_, i) =>
        (i % 2 === 0
          ? eslint.lintText(md, { filePath: `f${i}.md` })
          : eslint.lintText(json, { filePath: `f${i}.json` })))
      const start = performance.now()
      await Promise.all(files)
      const elapsed = performance.now() - start
      // 200 small files must finish well under a second (prettier GQL cache + warm JIT).
      expect(elapsed).toBeLessThan(1000)
    })
  })
})
