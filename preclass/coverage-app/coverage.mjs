import inspector from 'inspector/promises'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

function filterResult(result) {
  return result.filter(({ url }) => {
    const finalUrl = url.replace('file://', '')
    // node a node: module
    return path.isAbsolute(finalUrl) &&
      // not this coverage file
      finalUrl !== __filename
  })
}

async function collectMetrics({ entryPoint }) {
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
    await import(`./${entryPoint}`)
  } catch (error) { }

  const preciseCoverage = await session.post('Profiler.takePreciseCoverage')
  await session.post('Profiler.stopPreciseCoverage')

  const results = filterResult(preciseCoverage.result)
  for (const coverage of results) {
    const filename = fileURLToPath(coverage.url)
    const sourceCode = await fs.readFile(filename, 'utf8')
    generateCoverageReport(filename, sourceCode, coverage.functions)
  }
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

  console.log('\n', '\x1b[32m' + filename + '\x1b[0m')

  sourceCode.split('\n').forEach((line, i) => {
    if (uncoveredLines.includes(i + 1) && !line.startsWith('}')) {
      console.log('\x1b[31m' + line + '\x1b[0m')
    } else {
      console.log(line)
    }
  })
}

// we could've get this filename from the cli
// and execute something like ./coverage.mjs index.mjs as c8 does
const entryPoint = './index.mjs'
collectMetrics({ entryPoint })