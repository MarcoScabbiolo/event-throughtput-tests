use std::fmt;

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct EndpointResponse {
  name: String,
  age: u8,
  description: String,
  notes: String,
}

#[derive(Serialize, Clone)]
pub struct DatabaseModel {
  name: String,
  age: u8,
}

impl DatabaseModel {
  pub fn from_endpoint_response(endpoint_response: &EndpointResponse) -> DatabaseModel {
    DatabaseModel { name: endpoint_response.name.clone(), age: endpoint_response.age }
  }
}

impl fmt::Display for EndpointResponse {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    write!(f, "EndpointResponse [name: {}, age: {}, description size: {}, notes size: {}]", self.name, self.age, self.description.len(), self.notes.len())
  }
}

impl fmt::Display for DatabaseModel {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    write!(f, "DatabaseModel [name: {}, age: {}]", self.name, self.age)
  }
}

impl fmt::Debug for DatabaseModel {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    write!(f, "{}", self)
  }
}