import { execaCommand } from 'execa'
import { resolve } from 'path'
import moment from 'moment'
import * as url from 'url';
import ora from 'ora'
import chalk from 'chalk'
import * as readline from 'readline'
import { MongoClient } from "mongodb"

const parseArgument = (arg) => arg && (arg.startsWith('-') ? null : arg)

// Config
const WAIT_FOR_DOCKER_TIMEOUT = 1000 * 10
const WAIT_TO_DUMP_DATA_TIMEOUT = 1000 * 10
const VERBOSE = process.argv.some(a => a === '-v' || a === '--verbose')
const DONT_RUN = process.argv.some(a => a === '--dont-run')
const CONFIRM_INBETWEEN_RUNS = process.argv.some(a => a === '-c' || a === '--confirm')
const MESSAGE_COUNT = Number(process.argv[2])
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
    srcDir: 'kotlin/spring',
    cwd: resolve(ROOT, './kotlin/spring'),
    buildCommand: './gradlew build',
    messageCount: Math.floor(MESSAGE_COUNT / 10),
    timeMagnitude: 'seconds',
    timestampRegex: '((\\S)+)',
    runCommand: (messageCount) => `java -jar build/libs/demo-0.0.1-SNAPSHOT.jar --count=${messageCount}`,
    color: '#6db33f',
    textColor: '#FFF'
  },
  {
    id: 'kotlin-quarkus',
    name: 'Quarkus',
    srcDir: 'kotlin/quarkus',
    cwd: resolve(ROOT, './kotlin/quarkus'),
    buildCommand: 'quarkus build --native',
    messageCount: Math.floor(MESSAGE_COUNT / 10),
    timeMagnitude: 'seconds',
    timestampRegex: '(\\S+\\s\\S+)',
    runCommand: (messageCount) => `./build/code-with-quarkus-1.0.0-SNAPSHOT-runner`,
    color: '#4695eb',
    textColor: '#ff004a'
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
    if (DONT_RUN) {
      spinner.clear()
      console.log('All built and infra running, would have ran:')
      console.log(language.runCommand(language.messageCount))
      spinner.text = 'Press any key to create the messages'
      await waitForPrompt('')
      await dumpData(language)
      await waitForTomorrow()
    } else {
      spinner.text = 'Executing ' + language.name
      await runLanguage(language, infra)
    }
  }

  spinner.text = 'Cleaning up infrastructure'
  spinner.start()
  await cleanup()
  spinner.clear()
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
        const diff = moment(matches[1], language.dateTimeFormat).diff(start, language.timeMagnitude)
        const diffText = `${diff} ${language.timeMagnitude}`
        resolve(chalk[TIME_MAGNITUDE_COLORS[language.timeMagnitude]](diffText))
      }
    }
    command.stdout.on('data', reader)
    command.stderr.on('data', reader)
  })

  await wait(WAIT_TO_DUMP_DATA_TIMEOUT)
  start = moment()
  await dumpData(language)

  const timePassed = await checkpointReached

  spinner.text = 'Validating results'
  await wait(5000)

  const docCount = await new MongoClient('mongodb://root:example@localhost:27017')
    .db('performance-test')
    .collection('models')
    .countDocuments();

  spinner.clear()

  if (docCount >= language.messageCount) {
    console.log(
      languageConsoleName(language) +
      chalk.white(' took ') +
      timePassed +
      chalk.white(' to process ') +
      chalk[language.messageCount >= MESSAGE_COUNT ? 'green' : 'yellow'].bold(language.messageCount) +
      chalk.white(' messages ')
    )
  } else {
    console.log(
      languageConsoleName(language) +
      chalk.bold.red(' failed ') +
      chalk.white('to load all documents in the database') +
      chalk.white('. Expected ') +
      chalk.bold.green(language.messageCount) +
      chalk.white(' documents but found ') +
      chalk.bold.red(docCount)
    )
  }

  if (CONFIRM_INBETWEEN_RUNS) {
    spinner.text = 'Press any key to continue'
    await waitForPrompt('')
  }

  command.cancel()
  infra.endpoint.cancel()
  infra.docker.cancel()
}

const setup = async (messageCount) => {
  await cleanup()
  await execaCommand(`node ./scripts/make-data.js ${messageCount}`, { cwd: ROOT })

  const endpoint = execaCommand("yarn start", { cwd: ENDPOINT })
  const docker = execaCommand("docker-compose up", { cwd: ROOT })

  return { endpoint, docker }
}

const dumpData = async (language) => {
  await execaCommand(`docker exec performance-test-kafka sh ./load-data.sh ${language.id}`)
}

const cleanup = async () => {
  await execaCommand("docker-compose down", { cwd: ROOT })
}

const waitForPrompt = (query) => {
  const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
      rl.close();
      resolve(ans);
  }))
}

const languageConsoleName = (language) =>
  chalk.bgHex(language.color).hex(language.textColor).bold(` ${language.name} `)

const waitForTomorrow = async () => {
  spinner.text = 'Waiting for tomorrow'
  spinner.start()
  await wait(1000 * 60 * 60 * 24)
}