use clap::Parser;

#[derive(Default, Parser, Debug, Clone)]
#[command(author, version, about, long_about = None)]
pub struct CommandLineArguments {
  #[arg( long, default_value = "localhost:29092")]
  pub brokers: String,

  #[arg(long, default_value = "performance-test")]
  pub group_id: String,

  #[arg(short, long, default_value = "rust")]
  pub topic: String,

  #[arg(short, long, default_value_t = 10)]
  pub workers: u8,

  #[arg(long, default_value = "http://localhost:3000/")]
  pub endpoint_url: String,

  #[arg(long, default_value = "mongodb://root:example@localhost:27017")]
  pub mongodb_url: String,

  #[arg(long, default_value = "performance-test")]
  pub database: String,

  #[arg(long, default_value = "models")]
  pub collection: String,

  #[arg(short, long, default_value_t = 1000)]
  pub message_count_checkpoint: u64,
}

pub fn parse_command_line_arguments() -> CommandLineArguments {
  CommandLineArguments::parse()
}