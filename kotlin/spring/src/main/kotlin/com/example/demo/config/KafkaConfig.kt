package com.example.demo.config

import org.apache.kafka.clients.consumer.ConsumerConfig
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory
import org.springframework.kafka.core.DefaultKafkaConsumerFactory

@Configuration
class KafkaConfig {
    @Bean
    fun consumerFactory() = DefaultKafkaConsumerFactory<String?, Any?>(mapOf(
        ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG to "localhost:29092",
    ))

    @Bean
    fun kafkaListenerContainerFacotry() = ConcurrentKafkaListenerContainerFactory<String, Any>()
        .also {
            it.consumerFactory = consumerFactory()
            it.setConcurrency(10)
        }
}