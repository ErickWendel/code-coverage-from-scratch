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
}

// function generateCoverageReport(sourceCode, coverage) {
//   console.log(JSON.stringify(coverage, null, 2))
//   // split the source code into an array of lines
//   let lines = sourceCode
//   let myLines = ''
//   for (const fn of coverage) {
//     if (!fn.functionName) continue;

//     for (const range of fn.ranges) {
//       if (range.count) continue;

//       const input = lines;
//       const output = input.slice(0, range.startOffset) +
//         // "<---- aqui" +
//         "\x1b[31m" + 
//         input.slice(range.startOffset, range.endOffset) +
//         // ">---- aqui" +
//         "\x1b[0m" + 
//         input.slice(range.endOffset);
//       myLines = output
//       break
//     }
//   }
//   console.log(myLines)
// }

function generateCoverageReport(sourceCode, coverage) {
  // split the source code into an array of lines
  let lines = sourceCode
  let linesSplitted = sourceCode.split('\n')
  console.log(JSON.stringify(coverage, null, 2))
  for (const fn of coverage) {
    if (!fn.functionName) continue;

    for (const range of fn.ranges) {
      if (range.count) continue;

      const fullLine = lines.slice(range.startOffset, range.endOffset).trimStart()
      const str = linesSplitted.map(item => item.trimStart())
      for (const i of fullLine.split('\n').map(item => item.trimStart())) {
        const index = str.indexOf(i)
        if(index == -1) continue;
        // console.log('line', linesSplitted[index])
        linesSplitted[index] = `\x1b[31m ${linesSplitted[index]} \x1b[0m`
      }
    }
  }
  console.log(linesSplitted.join("\n"))
}
// start the showMetrics function
showMetrics();