use std::io;

use clap::{CommandFactory, ValueEnum};
use clap_complete::Shell as CompletionShell;
use clap_complete_nushell::Nushell;

use crate::{BIN_NAME, Cli};

pub const HELP: &str = r#"Examples:
  badag completions bash       > badag.bash
  badag completions elvish     > badag.elv
  badag completions fish       > badag.fish
  badag completions nushell    > badag.nu
  badag completions powershell > badag.ps1
  badag completions zsh        > _badag

Write the script where your shell loads completions.
"#;

// Shell names are proper nouns; the shared `sh` suffix is incidental.
#[allow(clippy::enum_variant_names)]
#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum Shell {
    Bash,
    Elvish,
    Fish,
    Nushell,
    #[value(name = "powershell")]
    PowerShell,
    Zsh,
}

impl Shell {
    /// `None` for Nushell, which `clap_complete` does not generate.
    const fn clap_complete_shell(self) -> Option<CompletionShell> {
        match self {
            Self::Bash => Some(CompletionShell::Bash),
            Self::Elvish => Some(CompletionShell::Elvish),
            Self::Fish => Some(CompletionShell::Fish),
            Self::PowerShell => Some(CompletionShell::PowerShell),
            Self::Zsh => Some(CompletionShell::Zsh),
            Self::Nushell => None,
        }
    }
}

pub fn print(shell: Shell) {
    let mut command = Cli::command();
    let mut out = io::stdout();

    match shell.clap_complete_shell() {
        Some(shell) => clap_complete::generate(shell, &mut command, BIN_NAME, &mut out),
        None => clap_complete::generate(Nushell, &mut command, BIN_NAME, &mut out),
    }
}
