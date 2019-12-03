import { spawn } from 'child_process'
import { promisify } from 'util'
import program from 'commander'
import walk from '@fcostarodrigo/walk'
import lineReader from 'line-reader'

const eachLine = promisify(lineReader.eachLine)

interface Summary {
  failures: string[]
  successCount: number
}

program.option('--grep <pattern>', 'RegExp to filter the test cases')
program.option('--baseUri <baseUri>', 'Base resource URI')

program.parse(process.argv)

function parseScenarios() {
  return new Promise((resolve, reject) => {
    console.log('\n------\n   Compiling test scenarios\n------\n')
    const childProcess = spawn('node_modules/.bin/hypertest-compiler', ['tests'], { stdio: 'inherit' })

    childProcess.on('exit', code => {
      if (code === 0) {
        resolve()
      }

      reject(new Error('Failed to compile test scenarios'))
    })
  })
}

async function filterScenarios() {
  const scenarios: [string, string][] = []
  for await (const file of walk()) {
    const matches = file.match(/tests\/(.+)\.hydra$/)

    if (!matches) {
      continue
    }

    const scenario = matches[1]
    if (!program.grep || scenario.match(program.grep)) {
      let resourcePath = ''
      await eachLine(file, (line) => {
        const matchesResourcePath = line.match(/\/\/.+RESOURCE=(.+)/)
        if (matchesResourcePath) {
          resourcePath = matchesResourcePath[1]
          return false
        }
      })
      scenarios.push([scenario, resourcePath])
    }
  }

  return scenarios
}

function runScenarios(scenarios: [string, string][]): Promise<Summary> {
  const summary: Summary = {
    failures: [],
    successCount: 0,
  }

  return scenarios.reduce((promise, [scenario, path]) => {
    return promise.then(summary => {
      return new Promise(resolve => {
        const command = `node_modules/.bin/hydra-validator e2e --docs tests/${scenario}.hydra.json ${program.baseUri}${path}`
        console.log(`\n------\n   ${command}\n------\n`)

        const childProcess = spawn(
          'node_modules/.bin/hydra-validator',
          ['e2e', '--docs', `tests/${scenario}.hydra.json`, `${program.baseUri}${path}`, '--strict'],
          { stdio: 'inherit' })

        childProcess.on('exit', code => {
          if (code !== 0) {
            summary.failures.push(scenario)
          } else {
            summary.successCount += 1
          }

          resolve(summary)
        })
      })
    })
  }, Promise.resolve(summary))
}

function summary(summary: Summary) {
  console.log('\n------\n   Summary\n------\n')

  const total = summary.failures.length + summary.successCount
  console.log(`${summary.successCount}/${total} scenarios succeeded.`)

  if (summary.failures.length > 0) {
    console.log('\n------\n   Failed scenarios\n------\n')

    summary.failures.sort().forEach(failure => {
      console.log(`  - ${failure}`)
    })
  }

  process.exit(summary.failures.length)
}

parseScenarios()
  .then(filterScenarios)
  .then(runScenarios)
  .then(summary)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
