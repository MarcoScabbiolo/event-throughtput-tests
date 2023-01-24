package com.example.demo.services

import com.example.demo.models.EndpointModel
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class Endpoint(
    val restTemplate: RestTemplate
) {
    fun request(path: String) = restTemplate.getForEntity("http://localhost:3000/$path", EndpointModel::class.java).body!!
}