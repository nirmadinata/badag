pub mod dev;

use std::error::Error;

use crate::cli::Command;

pub type Result<T, E = Box<dyn Error + Send + Sync>> = std::result::Result<T, E>;

pub async fn run(command: Command) -> Result<()> {
    match command {
        Command::Dev => dev::run().await,
    }
}
