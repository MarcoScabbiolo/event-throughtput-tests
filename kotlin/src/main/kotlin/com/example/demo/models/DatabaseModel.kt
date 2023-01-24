package com.example.demo.models

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document

@Document
data class DatabaseModel(
    @Id var id: String?,
    var name: String,
    var age: Int
) {
    companion object {
        fun fromEndpointModel(endpointModel: EndpointModel) = DatabaseModel(
            id = null,
            name = endpointModel.name,
            age = endpointModel.age
        )
    }
}