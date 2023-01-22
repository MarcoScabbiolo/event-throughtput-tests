use std::fmt;

use mongodb::{options::ClientOptions, Client, error::Error, Collection};
use tap::Pipe;

use crate::model::DatabaseModel;

#[derive(Debug)]
pub enum DatabaseError {
  UnableToCreateClient(Error),
  SaveFailed(DatabaseModel, Error),
}

pub async fn create_mongodb_client(url: String) -> Result<Client, DatabaseError> {
  ClientOptions::parse(url)
    .await
    .map_err(DatabaseError::UnableToCreateClient)?
    .pipe(Client::with_options)
    .map_err(DatabaseError::UnableToCreateClient)
}

pub async fn save_to_mongodb(collection: &Collection<DatabaseModel>, model: &DatabaseModel) -> Result<(), DatabaseError> {
  collection
    .insert_one(model, None)
    .await
    .map_err(|err| { DatabaseError::SaveFailed(model.to_owned(), err) })
    .map(|_| { () })
}

impl fmt::Display for DatabaseError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      DatabaseError::UnableToCreateClient(ref error) =>
        write!(f, "Unable to create mongodb client: {}", error),
      DatabaseError::SaveFailed(ref model, ref error) =>
        write!(f, "Unable to save {} to mongodb: {}", model, error),
    }
  }
}

