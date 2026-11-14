use std::process::{Command, Output};

const BIN: &str = env!("CARGO_BIN_EXE_badag");

fn badag(args: &[&str]) -> Output {
    Command::new(BIN)
        .args(args)
        .output()
        .expect("badag should be runnable")
}

fn stdout_of(output: &Output) -> String {
    String::from_utf8(output.stdout.clone()).expect("completion scripts are UTF-8")
}

#[test]
fn dev_prints_its_message() {
    let output = badag(&["dev"]);

    assert!(output.status.success());
    assert_eq!(stdout_of(&output), "this is from dev command\n");
    assert!(output.stderr.is_empty());
}

#[test]
fn each_shell_gets_its_own_completion_script() {
    let expected = [
        ("bash", "complete -F _badag"),
        ("elvish", "set edit:completion:arg-completer[badag]"),
        ("fish", "complete -c badag"),
        ("nushell", "export extern badag"),
        (
            "powershell",
            "Register-ArgumentCompleter -Native -CommandName 'badag'",
        ),
        ("zsh", "#compdef badag"),
    ];

    for (shell, marker) in expected {
        let output = badag(&["completions", shell]);

        assert!(
            output.status.success(),
            "{shell}: generator exited with {}",
            output.status
        );
        let script = stdout_of(&output);
        assert!(script.contains(marker), "{shell}: script lacks {marker:?}");
    }
}

#[test]
fn unknown_shell_reports_supported_values_on_stderr() {
    let output = badag(&["completions", "tcsh"]);
    let stderr = String::from_utf8(output.stderr).expect("stderr is UTF-8");

    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty(), "no script may be written");
    assert!(stderr.contains("'tcsh'"), "{stderr}");
    assert!(
        stderr.contains("[possible values: bash, elvish, fish, nushell, powershell, zsh]"),
        "{stderr}"
    );
}
