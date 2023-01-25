package org.acme.services

import io.quarkus.mongodb.reactive.ReactiveMongoClient
import io.smallrye.mutiny.Uni
import org.acme.models.DatabaseModel
import org.bson.Document
import javax.enterprise.context.ApplicationScoped

@ApplicationScoped
class Database(private val client: ReactiveMongoClient) {
    fun save(model: DatabaseModel): Uni<Void> = Document()
        .append("name", model.name)
        .append("age", model.age)
        .let { collection().insertOne(it) }
        .onItem()
        .ignore()
        .andContinueWithNull()

    private fun collection() = client.getDatabase("performance-test").getCollection("models")
}