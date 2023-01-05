const inspector = require('inspector/promises')
const fs = require('fs/promises')
const path = require('path')

function filterResult(result) {
  return result.filter((file) => {
    let url = file.url
    url = url.replace('file://', '')
    return path.isAbsolute(url) && url !== __filename
  })
}

async function showMetrics() {
  // create a new inspector session
  const session = new inspector.Session()
  inspector.open(0, true)
  // connect to the inspector session
  session.connect()

  // enable the debugger
  await session.post('Profiler.enable')
  await session.post('Debugger.enable')
  await session.post(
    'Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: true
  }
  )
  const moduleName = 'sum'
  require(`./${moduleName}`)

  const preciseCoverage = await session.post('Profiler.takePreciseCoverage')
  await session.post('Profiler.stopPreciseCoverage')
  const results = filterResult(preciseCoverage.result)
  for (const coverage of results) {
    const sourceCode = await fs.readFile(coverage.url.replace('file://', ''), 'utf8')
    generateCoverageReport(sourceCode, coverage.functions)

  }
}

function generateCoverageReport(sourceCode, coverage) {
  // Find the lines of code that are not covered by the test cases
  const uncoveredLines = []
  coverage.forEach(cov => {
    cov.ranges.forEach(range => {
      if (range.count !== 0) return
      // Extract the lines of code from the start and end offsets
      const startLine = sourceCode.substring(0, range.startOffset).split('\n').length
      const endLine = sourceCode.substring(0, range.endOffset).split('\n').length
      for (let i = startLine; i <= endLine; i++) {
        uncoveredLines.push(i)
      }

    })
  })

  // Enclose the uncovered lines of code in ANSI escape codes for red text,
  // ignoring lines that start with "}"
  sourceCode.split('\n').forEach((line, i) => {
    if (uncoveredLines.includes(i + 1) && !line.startsWith('}') ) {
      console.log('\x1b[31m' + line + '\x1b[0m')
    } else {
      console.log(line)
    }
  })
}

showMetrics()