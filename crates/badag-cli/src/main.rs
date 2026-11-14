mod completions;
mod dev;

use anyhow::Result;
use clap::{Parser, Subcommand};

use crate::completions::Shell;

const BIN_NAME: &str = "badag";

#[derive(Debug, Parser)]
#[command(name = BIN_NAME, version, about = "Command-line interface for Badag")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Start the local development server
    Dev,

    /// Print a shell completion script to stdout
    #[command(after_long_help = completions::HELP)]
    Completions {
        /// Shell to generate the script for
        #[arg(value_enum)]
        shell: Shell,
    },
}

fn main() -> Result<()> {
    match Cli::parse().command {
        Command::Dev => dev::run()?,
        Command::Completions { shell } => completions::print(shell),
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use clap::CommandFactory;

    use super::Cli;

    #[test]
    fn cli_definition_is_valid() {
        Cli::command().debug_assert();
    }
}
