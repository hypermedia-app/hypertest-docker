import { spawn } from 'child_process'
import { mkdir } from 'temp'
import copydir from 'copy-dir'
import program from 'commander'
import walk from '@fcostarodrigo/walk'

interface Summary {
  failures: string[]
  successCount: number
}

interface Scenario {
  name: string
  file: string
}

program.option('--dir <pattern>', 'Directory to run tests from', '/tests')
program.option('--grep <pattern>', 'RegExp to filter the test cases')
program.option('--baseUri <baseUri>', 'Base resource URI')
program.option('--compileInPlace', 'Compile in the same directory', false)

program.parse(process.argv)

function headerLog(...texts: string[]) {
  console.log(`
------
${texts.map(text => `   ${text}`).join('\n')}
------
`)
}

function copyScenarios(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (program.compileInPlace) {
      resolve(program.dir)
      return
    }

    mkdir('', (err, tempDir) => {
      if (err) {
        reject(err)
        return
      }

      copydir.sync(program.dir, tempDir)

      resolve(tempDir)
    })
  })
}

function parseScenarios(dir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const headerMessages = ['Compiling test scenarios', `Directory used: ${program.dir}`]
    if (dir !== program.dir) {
      headerMessages.push(`Using temp directory for compiled output: ${dir}`)
    }

    headerLog(...headerMessages)
    const childProcess = spawn('node_modules/.bin/hypertest-compiler', [dir], { stdio: 'inherit' })

    childProcess.on('exit', code => {
      if (code === 0) {
        resolve(dir)
      }

      reject(new Error('Failed to compile test scenarios'))
    })
  })
}

async function filterScenarios(dir: string) {
  const scenarios: Scenario[] = []
  const skipped: string[] = []
  for await (const file of walk(dir)) {
    const matches = file.match(new RegExp(`${dir}/(.+)\\..+\\.hypertest\\.json$`))

    if (!matches) {
      continue
    }

    const scenario = matches[1]
    if (!program.grep || scenario.match(program.grep)) {
      scenarios.push({
        name: scenario,
        file,
      })
    } else {
      skipped.push(scenario)
    }
  }

  if (skipped.length > 0) {
    headerLog('Skipped scenarios not matching pattern:', ...skipped.map(s => `- ${s}`))
  }

  return scenarios
}

function runScenarios(scenarios: Scenario[]): Promise<Summary> {
  const summary: Summary = {
    failures: [],
    successCount: 0,
  }

  return scenarios.reduce((promise, { name, file }) => {
    return promise.then(summary => {
      return new Promise(resolve => {
        headerLog(`Running scenario ${name}`)

        const childProcess = spawn(
          'node_modules/.bin/hydra-validator',
          ['e2e', '--docs', `../${file}`, program.baseUri, '--strict'],
          { stdio: 'inherit' })

        childProcess.on('exit', code => {
          if (code !== 0) {
            summary.failures.push(name)
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
  headerLog('Summary')

  const total = summary.failures.length + summary.successCount
  console.log(`${summary.successCount}/${total} scenarios succeeded.`)

  if (summary.failures.length > 0) {
    headerLog('Failed scenarios')

    summary.failures.sort().forEach(failure => {
      console.log(`  - ${failure}`)
    })
  }

  process.exit(summary.failures.length)
}

function header() {
  headerLog(`Using packages:
  
@hydrofoil/hypertest: ${require('@hydrofoil/hypertest/package.json').version}
hydra-validator-e2e: ${require('hydra-validator-e2e/package.json').version}`)

  return Promise.resolve()
}

header()
  .then(copyScenarios)
  .then(parseScenarios)
  .then(filterScenarios)
  .then(runScenarios)
  .then(summary)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
