package com.example.demo.config

import org.springframework.boot.web.client.RestTemplateBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestTemplate

@Configuration
class EndpointConfig{
    @Bean
    fun httpClient(): RestTemplate = RestTemplateBuilder().build()
}