use std::fmt::Display;
use std::sync::{Arc, Mutex};

use futures::{TryStreamExt, StreamExt};
use futures::stream::FuturesUnordered;
use log::{info, warn, LevelFilter};
use args::{parse_command_line_arguments, CommandLineArguments};
use ::mongodb::Collection;
use tap::Pipe;

use crate::http::{request_endpoint, create_http_client};
use crate::kafka::{create_kafka_consumer, subscribe_to_kafka_topic, parse_message_payload};
use crate::model::DatabaseModel;
use crate::mongodb::{create_mongodb_client, save_to_mongodb};

mod args;
mod kafka;
mod http;
mod model;
mod mongodb;

#[tokio::main]
async fn main() {
  env_logger::builder().filter_level(LevelFilter::Info).init();

  info!("Starting...");

  let arguments = parse_command_line_arguments();
  let message_counter: Arc<Mutex<u64>> = Arc::new(Mutex::new(1));
  let mongodb_connection = create_mongodb_client(arguments.mongodb_url.to_owned()).await
    .expect("Connection to mongodb");
  let mongodb_database = mongodb_connection.database(&arguments.database);
  let mongodb_collection = mongodb_database.collection::<DatabaseModel>(&arguments.collection)
    .pipe(Arc::new);

  info!("Spwaning {} workers...", arguments.workers);

  (0..arguments.workers).map(|index| {
    tokio::spawn(
      run_async_processor(
        arguments.clone(),
        message_counter.clone(),
        index,
        mongodb_collection.clone()
      )
    )
  }).collect::<FuturesUnordered<_>>().for_each(|_| async { }).await;
}

async fn run_async_processor(
  arguments: CommandLineArguments,
  message_counter: Arc<Mutex<u64>>,
  worker_number: u8,
  collection: Arc<Collection<DatabaseModel>>,
) {
  let consumer = create_kafka_consumer(&arguments.group_id, &arguments.brokers)
    .expect("Kafka consumer creation failed");

  subscribe_to_kafka_topic(&consumer, &arguments.topic)
    .expect("Can't subscribe to specified topic");

  consumer
    .stream()
    .try_for_each(|borrowed_message| {
      let http_client = create_http_client();
      let endpoiont_url = arguments.endpoint_url.to_owned();
      let message_counter = message_counter.clone();
      let collection = collection.clone();

      async move {
        let message_number = message_counter_view(&message_counter);
        let message = borrowed_message.detach();

        tokio::spawn(async move {
          let payload = match parse_message_payload(&message, &message_number) {
            Ok(p) => p,
            Err(error) => {
              warn(&error);
              return
            }
          };

          let response = match request_endpoint(&http_client, endpoiont_url.clone() + &payload).await {
            Ok(r) => r,
            Err(error) => {
              warn(&error);
              return
            }
          };

          let model = DatabaseModel::from_endpoint_response(&response);

          match save_to_mongodb(&collection, &model).await {
            Ok(()) => {},
            Err(error) => {
              warn(&error);
              return
            }
          }

          if message_number % arguments.message_count_checkpoint == 0 {
            info!("Processed {} messages", arguments.message_count_checkpoint)
          }

        });

        Ok(())
      }
    })
    .await
    .unwrap_or_else(|_| panic!("Worker {} dropped", worker_number));

  info!("Worker {} ended", worker_number);
}

fn message_counter_view(counter: &Mutex<u64>) -> u64 {
  let mut message_counter = counter.lock().expect("Unable to gain lock on message counter");
  let current = *message_counter;
  *message_counter += 1;
  current
}

fn warn(message: &impl Display) {
  warn!("{}", message)
}