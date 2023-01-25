package org.acme.models

data class DatabaseModel(
    var name: String,
    var age: Int
) {
    companion object {
        fun fromEndpointModel(endpointModel: EndpointModel) = DatabaseModel(
            name = endpointModel.name,
            age = endpointModel.age
        )
    }
}