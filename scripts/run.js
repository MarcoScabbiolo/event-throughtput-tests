import { execaCommand } from 'execa'
import { resolve } from 'path'
import moment from 'moment'
import * as url from 'url';
import ora from 'ora'
import chalk from 'chalk'

const parseArgument = (arg) => arg && (arg.startsWith('-') ? null : arg)

// Config
const WAIT_FOR_DOCKER_TIMEOUT = 1000 * 10
const WAIT_TO_DUMP_DATA_TIMEOUT = 1000 * 10
const VERBOSE = process.argv.some(a => a === '-v' || a === '--verbose')
const MESSAGE_COUNT = process.argv[2]
const LANGUAGE = parseArgument(process.argv[3])

const ROOT = resolve(url.fileURLToPath(new URL('.', import.meta.url)), '../')
const ENDPOINT = resolve(ROOT, './endpoint')

const LANGUAGES = [
  {
    id: 'rust',
    name: 'Rust',
    srcDir: 'rust',
    cwd: resolve(ROOT, `./rust`),
    buildCommand: 'cargo build -r',
    messageCount: MESSAGE_COUNT,
    timestampRegex: '\\[((\\S)+)',
    timeMagnitude: 'milliseconds',
    runCommand: (messageCount) => `./target/release/rust -m=${messageCount}`,
    color: '#B94700',
    textColor: '#000',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    srcDir: 'js',
    cwd: resolve(ROOT, `./js`),
    buildCommand: 'yarn',
    messageCount: Math.floor(MESSAGE_COUNT / 10),
    timeMagnitude: 'seconds',
    timestampRegex: '\\[((\\S)+)\\]',
    runCommand: (messageCount) => `node index.js ${messageCount}`,
    color: '#F0DB4F',
    textColor: '#323330',
  },
  {
    id: 'kotlin-spring',
    name: 'Spring',
    srcDir: 'kotlin',
    cwd: resolve(ROOT, './kotlin'),
    buildCommand: './gradlew build',
    messageCount: Math.floor(MESSAGE_COUNT / 10),
    timeMagnitude: 'seconds',
    timestampRegex: '((\\S)+)',
    runCommand: (messageCount) => `java -jar build/libs/demo-0.0.1-SNAPSHOT.jar --count=${messageCount}`,
    color: '#6db33f',
    textColor: '#FFF'
  }
]

const TIME_MAGNITUDE_COLORS = {
  milliseconds: 'green',
  seconds: 'yellow',
  minutes: 'red'
}

let start
let spinner = ora({ spinner: 'sand', color: 'green' })

;(async () => {
  let infra
  spinner.text = 'Preparing environment'
  spinner.start()
  await execaCommand("yarn", { cwd: ENDPOINT })
  spinner.clear()

  for (let language of LANGUAGES) {
    if (LANGUAGE && LANGUAGE !== language.srcDir) continue
    spinner.text = 'Cleaning and starting environment'
    spinner.start()
    infra = await setup(language.messageCount)
    spinner.text = 'Building ' + language.name
    await execaCommand(language.buildCommand, { cwd: language.cwd })
    spinner.text = 'Executing ' + language.name
    await runLanguage(language, infra)
  }

  process.exit(0)
})()

const wait = (time) => new Promise(resolve => setTimeout(resolve, time))

const runLanguage = async (language, infra) => {
  await wait(WAIT_FOR_DOCKER_TIMEOUT)
  const command = execaCommand(language.runCommand(language.messageCount), { cwd: language.cwd })

  const checkpointReached = new Promise(resolve => {
    const reader = (data) => {
      if (VERBOSE) console.log(data.toString())
      if (data.includes(`Processed ${language.messageCount} messages`)) {
        const matches = new RegExp(language.timestampRegex).exec(data)
        const diff = moment(matches[1]).diff(start, language.timeMagnitude)
        const diffText = `${diff} ${language.timeMagnitude}`
        resolve(chalk[TIME_MAGNITUDE_COLORS[language.timeMagnitude]](diffText))
      }
    }
    command.stdout.on('data', reader)
    command.stderr.on('data', reader)
  })

  await wait(WAIT_TO_DUMP_DATA_TIMEOUT)
  start = moment()
  await execaCommand(`docker exec performance-test-kafka sh ./load-data.sh ${language.id}`)

  const timePassed = await checkpointReached
  spinner.clear()
  console.log(
    chalk.bgHex(language.color).hex(language.textColor).bold(` ${language.name} `) +
    chalk.white(' took ') +
    timePassed +
    chalk.white(' to process ') +
    chalk[language.messageCount >= MESSAGE_COUNT ? 'green' : 'yellow'].bold(language.messageCount) +
    chalk.white(' messages ')
  )

  command.cancel()
  infra.endpoint.cancel()
  infra.docker.cancel()
}

const setup = async (messageCount) => {
  await execaCommand("docker-compose down", { cwd: ROOT })
  await execaCommand(`node ./scripts/make-data.js ${messageCount}`, { cwd: ROOT })

  const endpoint = execaCommand("yarn start", { cwd: ENDPOINT })
  const docker = execaCommand("docker-compose up", { cwd: ROOT })

  return { endpoint, docker }
}