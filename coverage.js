const inspector = require('inspector/promises');
const fs = require('fs/promises')
const path = require('path')

function filterResult(result) {
  return result.filter((file) => {
    let url = file.url
    url = url.replace('file://', '')
    return path.isAbsolute(url) && url !== __filename
  })
}

function insertAt(target, index, str) {
  return target.slice(0, index) + str + target.slice(index)
}
async function showMetrics() {
  // create a new inspector session
  const session = new inspector.Session();
  inspector.open(0, true)
  // connect to the inspector session
  session.connect();

  // promisify the .post method

  // enable the debugger
  await session.post('Profiler.enable');
  await session.post('Debugger.enable');
  await session.post(
    'Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true
    }
  )
  const moduleName = 'sum'
  require(`./${moduleName}`);

  const preciseCoverage = await session.post('Profiler.takePreciseCoverage')
  await session.post('Profiler.stopPreciseCoverage')
  const results = filterResult(preciseCoverage.result)
  for (const coverage of results) {
    const sourceCode = await fs.readFile(coverage.url.replace('file://', ''), 'utf8')
    generateCoverageReport(sourceCode, coverage.functions)

  }

  function generateCoverageReport(sourceCode, coverage) {
    // split the source code into an array of lines
    let lines = sourceCode
    
    for (const fn of coverage) {
      // if(!fn.functionName) continue;

      for (const range of fn.ranges) {
        if (range.count) continue;

        const fullLine = lines.slice(range.startOffset, range.endOffset).trimStart()
        console.log({ fullLine })
        const splitted = lines.split('\n')
        const line = splitted.findIndex((l) => l.indexOf(fullLine.replace(/\n/, '')) !== -1)
        if(line === -1) continue;
        splitted[line] = splitted[line].concat(' <--- //not covered!')
        lines = splitted.join('\n')
      }
    }
    console.log(lines)
  }
}
// start the showMetrics function
showMetrics();