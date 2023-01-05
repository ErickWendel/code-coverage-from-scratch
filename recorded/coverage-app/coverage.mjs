import inspector from 'inspector/promises'
import { fileURLToPath } from 'node:url'
import { isAbsolute } from 'node:path'
import { readFile } from 'node:fs/promises'
const currentFileName = fileURLToPath(import.meta.url)

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  END_LINE: '\x1b[0m',
}

function filterResults(coverage) {
  return coverage.result.filter(({ url }) => {
    const finalUrl = url.replace('file://', '')
    // first we need to ignore node: modules
    return isAbsolute(finalUrl) && 
      // no this file
      finalUrl !== currentFileName
  })
}

function generateCoverageReport(filename, sourceCode, functions){
  const uncoveredLines = []
  for(const cov of functions) {
    for( const range of cov.ranges) {
      if(range.count !== 0) continue
      const startLine = sourceCode.substring(0, range.startOffset).split('\n').length
      const endLine = sourceCode.substring(0, range.endOffset).split('\n').length
      for(let charIndex = startLine; charIndex <= endLine; charIndex ++) {
        uncoveredLines.push(charIndex);
      }
    }
  }
  console.log('\n', COLORS.GREEN + filename + COLORS.END_LINE)
  sourceCode.split('\n').forEach((line, lineIndex) => {
    if(uncoveredLines.includes(lineIndex + 1) && !line.startsWith('}')) {
      console.log(COLORS.RED + line + COLORS.END_LINE)
    }
    else {
      console.log(line)
    }
  })
}

// we coul've gotten this filename from cli 
// and execute the program like ./coverage index.js as c8 does
const ENTRYPOINT = './index.mjs'
const session = new inspector.Session()
session.connect()

await session.post('Profiler.enable')
await session.post('Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: true
})

await import(ENTRYPOINT)

const preciseCoverage = await session.post('Profiler.takePreciseCoverage')
await session.post('Profiler.stopPreciseCoverage')
const results = filterResults(preciseCoverage)
for(const coverage of results) {
  const filename = fileURLToPath(coverage.url)
  const sourceCode = await readFile(filename, 'utf8')
  generateCoverageReport(
    filename,
    sourceCode,
    coverage.functions
  )
}