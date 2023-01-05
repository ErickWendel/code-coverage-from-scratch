import inspector from 'inspector/promises'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const COLORS = {
  GREEN: '\x1b[32m',
  RED:'\x1b[31m',
  END_LINE: '\x1b[0m'
}


function filterResult(result) {
  return result.filter(({ url }) => {
    const finalUrl = url.replace('file://', '')
    // node a node: module
    return path.isAbsolute(finalUrl) &&
      // not this coverage file
      finalUrl !== __filename
  })
}

function generateCoverageReport(filename, sourceCode, coverage) {
  const uncoveredLines = []
  for (const cov of coverage) {
    for (const range of cov.ranges) {
      if (range.count !== 0) continue

      const startLine = sourceCode.substring(0, range.startOffset).split('\n').length
      const endLine = sourceCode.substring(0, range.endOffset).split('\n').length
      for (let i = startLine; i <= endLine; i++) {
        uncoveredLines.push(i)
      }
    }
  }

  console.log('\n' + COLORS.GREEN + filename + COLORS.END_LINE)
  sourceCode.split('\n').forEach((line, i) => {
    if (uncoveredLines.includes(i + 1) && !line.startsWith('}')) {
      console.log(COLORS.RED + line + COLORS.END_LINE)
    } else {
      console.log(line)
    }
  })
}

// we could've gotten this filename from the cli
// and execute something like ./coverage.mjs index.mjs as c8 does
const ENTRYPOINT = './index.mjs'
const session = new inspector.Session()
session.connect()

await session.post('Profiler.enable')
await session.post(
  'Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: true
})

// execute entry point
try {
  await import(`./${ENTRYPOINT}`)
} catch (error) { }

const preciseCoverage = await session.post('Profiler.takePreciseCoverage')
await session.post('Profiler.stopPreciseCoverage')

const results = filterResult(preciseCoverage.result)
for (const coverage of results) {
  const filename = fileURLToPath(coverage.url)
  const sourceCode = await fs.readFile(filename, 'utf8')
  generateCoverageReport(filename, sourceCode, coverage.functions)
}