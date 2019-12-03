import { argv } from 'yargs'
import { spawn } from 'child_process'

const baseUri = argv.baseUri || process.env.BASE_URI || process.env.BASE_URL
const grep = argv.grep || process.env.GREP

const args = ['run.js']
if (baseUri) {
  args.push('--baseUri', `${baseUri}`)
}
if (grep) {
  args.push('--grep', `${grep}`)
}
if (argv.dir) {
  args.push('--dir', `${argv.dir}`)
}

const analyser = spawn(
  'node',
  args,
  { stdio: 'inherit' })

analyser.on('exit', (code) => {
  process.exit(code)
})
