use std::fmt;
use std::str::Utf8Error;

use rdkafka::Message;
use rdkafka::config::ClientConfig;
use rdkafka::consumer::Consumer;
use rdkafka::consumer::stream_consumer::StreamConsumer;
use rdkafka::error::KafkaError;
use rdkafka::message::OwnedMessage;

#[derive(Debug, Clone)]
pub enum MessagingError {
  ReceivedPayloadIsNotAString(i64, u64, Utf8Error),
  ReceivedPayloadIsEmpty(i64, u64),
  Unknown(KafkaError)
}

pub fn create_kafka_consumer(
  group_id: &String,
  brokers: &String
) -> Result<StreamConsumer, MessagingError> {
  ClientConfig::new()
    .set("group.id", group_id)
    .set("bootstrap.servers", brokers)
    .set("enable.partition.eof", "false")
    .set("session.timeout.ms", "6000")
    .set("enable.auto.commit", "false")
    .create()
    .map_err(map_kafka_error)
}

pub fn subscribe_to_kafka_topic(
  consumer: &StreamConsumer,
  topic: &String
) -> Result<(), MessagingError> {
  consumer
    .subscribe(&[topic])
    .map_err(map_kafka_error)
}

pub fn parse_message_payload(message: &OwnedMessage, message_number: &u64) -> Result<String, MessagingError> {
  match message.payload_view::<str>() {
    Some(result) => match result {
      Ok(payload) => Ok(payload.to_string()),
      Err(err) => Err(MessagingError::ReceivedPayloadIsNotAString(message.offset(), message_number.to_owned(), err))
    },
    None => Err(MessagingError::ReceivedPayloadIsEmpty(message.offset(), message_number.to_owned()))
  }
}

pub fn message_offset_to_string(offset: &i64, message_number: &u64) -> String {
  format!("message {} (offset {})", message_number, offset)
}

impl fmt::Display for MessagingError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      MessagingError::ReceivedPayloadIsNotAString(ref offset, number, error) =>
        write!(f, "Received {} is not a string: {}", message_offset_to_string(offset, number), error),
      MessagingError::ReceivedPayloadIsEmpty(ref offset, ref number) => 
        write!(f, "Received {} has no payload", message_offset_to_string(offset, number)),
      MessagingError::Unknown(ref error) =>
        write!(f, "{}", error)
    }
  }
}

fn map_kafka_error(error: KafkaError) -> MessagingError {
  MessagingError::Unknown(error)
}