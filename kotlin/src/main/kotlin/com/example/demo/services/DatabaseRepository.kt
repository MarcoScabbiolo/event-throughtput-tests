package com.example.demo.services

import com.example.demo.models.DatabaseModel
import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.stereotype.Repository

@Repository
interface DatabaseRepository : MongoRepository<DatabaseModel, String>