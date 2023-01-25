package com.example.demo.services

import com.example.demo.models.DatabaseModel
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Component

@Component
class Consumer(
    @Value("\${count}") private val messageCountCheckpoint: String,
    private val endpoint: Endpoint,
    private val repository: DatabaseRepository,
) {
    private val lock = Object()
    private var counter = 0
    private var checkpoint = messageCountCheckpoint.toInt()
    private val logger = LoggerFactory.getLogger(javaClass)

    @KafkaListener(topics = ["kotlin-spring"], groupId = "performance-test", concurrency = "10")
    fun consume(message: String) {
        val messageNumber = synchronized(lock) { counter += 1; counter }
        endpoint.request(message)
            .let { DatabaseModel.fromEndpointModel(it) }
            .also { repository.insert(it) }

        if (messageNumber % checkpoint == 0) {
            logger.info("Processed $counter messages")
        }
    }
}