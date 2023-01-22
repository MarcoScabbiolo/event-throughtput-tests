import { createWriteStream } from 'fs'
import { resolve } from 'path'
import { faker } from '@faker-js/faker'
import * as url from 'url'

const AMMOUNT = process.argv[2]
const ws = createWriteStream(resolve(url.fileURLToPath(new URL('.', import.meta.url)), '../data.txt'))

let i = 0

;(function write(err) {
  if (err || i >= AMMOUNT) return;
  const sha = faker.git.commitSha()
  i += 1
  ws.write(`${sha},${sha}\n`, write)
})(null)