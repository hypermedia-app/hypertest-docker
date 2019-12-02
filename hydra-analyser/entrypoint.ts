import { spawn } from 'child_process'

const entrypointUrl = process.argv.length > 2 ? process.argv[2] : process.env.ENTRYPOINT_URL

const args = []
if (entrypointUrl) {
  args.push('analyse', entrypointUrl)
}

const analyser = spawn(
  'node_modules/.bin/hydra-validator',
  args,
  { stdio: 'inherit' })

analyser.on('exit', (code) => {
  process.exit(code)
})
