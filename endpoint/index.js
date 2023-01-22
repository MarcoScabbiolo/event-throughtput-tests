const Koa = require('koa')
const { koaBody } = require('koa-body')
const app = new Koa()
const { faker } = require('@faker-js/faker')

app.use(koaBody())

app.use(async (ctx) => {
  console.log(`Received id ${ctx.path.replace("/", "")}`)
  ctx.body = {
    name: faker.name.fullName(),
    age: Number(faker.random.numeric(2)),
    description: faker.lorem.paragraph(5),
    notes: faker.lorem.paragraphs(2),
  }
  await new Promise(resolve => setTimeout(resolve, 250))
})

app.listen(3000)