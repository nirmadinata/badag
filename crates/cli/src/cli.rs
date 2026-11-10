use clap::{Parser, Subcommand};

/// Command line interface for the project.
#[derive(Debug, Parser)]
#[command(version, about, arg_required_else_help = true)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Placeholder for local development.
    Dev,
}
