mod completions;

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

fn main() {
    match Cli::parse().command {
        Command::Dev => println!("this is from dev command"),
        Command::Completions { shell } => completions::print(shell),
    }
}
