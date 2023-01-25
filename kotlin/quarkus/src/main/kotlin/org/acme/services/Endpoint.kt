package org.acme.services

import io.smallrye.mutiny.Uni
import org.acme.models.EndpointModel
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.PathParam

@Path("/")
@RegisterRestClient(configKey = "endpoint")
interface Endpoint {
    @GET
    @Path("/{message}")
    fun get(@PathParam("message") message: String): Uni<EndpointModel>
}