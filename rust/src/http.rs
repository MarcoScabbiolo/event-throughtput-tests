use std::{fmt, string::FromUtf8Error};

use futures::TryFutureExt;
use tap::Pipe;

use hyper::{Client, client::HttpConnector, http::uri::InvalidUri, Uri, Response, Body};

use crate::model::EndpointResponse;

#[derive(Debug)]
pub enum HttpError {
  UnableToFormatEndpointUrl(InvalidUri),
  UnsucessfullResponse(Response<Body>),
  Failed(hyper::Error),
  InvalidBody(FromUtf8Error),
  InvalidJson(serde_json::Error)
}

pub fn create_http_client() -> Client<HttpConnector> {
  Client::new()
}

pub async fn request_endpoint(
  http_client: &Client<HttpConnector>,
  endpoint_url: String,
) -> Result<EndpointResponse, HttpError> {
  endpoint_url
    .parse::<Uri>()
    .map_err(HttpError::UnableToFormatEndpointUrl)?
    .pipe(|url| { http_client.get(url) })
    .await
    .pipe(|result| {
      match result {
        Ok(response) => {
          if response.status().is_success() {
            Ok(response.into_body())
          } else {
            Err(HttpError::UnsucessfullResponse(response))
          }
        },
        Err(error) => Err(HttpError::Failed(error)),
      }
    })?
    .pipe(hyper::body::to_bytes)
    .map_err(HttpError::Failed)
    .await?
    .to_vec()
    .pipe(String::from_utf8)
    .map_err(HttpError::InvalidBody)?
    .pipe_as_ref(serde_json::from_str::<EndpointResponse>)
    .map_err(HttpError::InvalidJson)
}

impl fmt::Display for HttpError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      HttpError::UnableToFormatEndpointUrl(ref error) =>
        write!(f,"Unable to format endpoint url: {}", error),
      HttpError::UnsucessfullResponse(ref response) =>
        write!(f, "Endpoint failed {}", response.status().canonical_reason().unwrap_or("Unknown")),
      HttpError::Failed(ref error) => write!(f, "Endpoint failed {}", error),
      HttpError::InvalidBody(ref error) => write!(f, "Unable to decode endpoint response body {}", error),
      HttpError::InvalidJson(ref error) => write!(f, "Invalid JSON response {}", error)
    }
  }
}