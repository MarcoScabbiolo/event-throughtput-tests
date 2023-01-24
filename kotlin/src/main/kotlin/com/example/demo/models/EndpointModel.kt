package com.example.demo.models

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class EndpointModel(
    val name: String,
    val age: Int,
    val description: String,
    val notes: String
)