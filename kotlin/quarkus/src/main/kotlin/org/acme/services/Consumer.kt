package org.acme.services

import io.smallrye.common.annotation.NonBlocking
import io.smallrye.mutiny.Uni
import org.acme.models.DatabaseModel
import org.eclipse.microprofile.reactive.messaging.Incoming
import org.eclipse.microprofile.rest.client.inject.RestClient
import org.jboss.logging.Logger
import javax.enterprise.context.ApplicationScoped
import javax.inject.Inject

@ApplicationScoped
class Consumer(
    private val database: Database,
) {
    @Inject
    @RestClient
    private lateinit var endpoint: Endpoint

    private val lock = Object()
    private var counter = 0
    private val logger = Logger.getLogger(Consumer::class.java)

    @Incoming("kotlin-quarkus")
    @NonBlocking
    fun consume(message: String): Uni<Void> {
        val messageNumber = synchronized(lock) { counter += 1; counter }
        return endpoint
            .get(message)
            .map { DatabaseModel.fromEndpointModel(it) }
            .flatMap { database.save(it) }
            .onItem()
            .ignore()
            .also {
                if (messageNumber % 1000 == 0) {
                    logger.info("Processed $counter messages")
                }
            }
            .andContinueWithNull()
    }
}