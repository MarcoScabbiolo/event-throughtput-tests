import { Kafka } from 'kafkajs'
import axios from 'axios'
import { MongoClient } from "mongodb"

const MESSAGE_CHECKPOINT = process.argv[2]

const kafka = new Kafka({
  clientId: 'javascript',
  brokers: ['localhost:29092'],
})


const client = new MongoClient('mongodb://root:example@localhost:27017');
const database = client.db('performance-test');
const collection = database.collection('models');

const consumer = kafka.consumer({ groupId: 'performace-test' })

await consumer.connect()
await consumer.subscribe({ topic: 'javascript', fromBeginning: true })

let messageCounter = 0

await consumer.run({
  partitionsConsumedConcurrently: 10,
  eachMessage: async ({ message }) => {
    messageCounter += 1
    const model = await axios.get(`http://localhost:3000/${message.value.toString()}`)
    await collection.insertOne({ name: model.name, age: model.age })
    if (messageCounter % MESSAGE_CHECKPOINT === 0) {
      console.log(`[${new Date().toISOString()}] Processed ${messageCounter} messages`)
    }
  },
});
