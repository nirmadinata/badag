use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

const BIN: &str = env!("CARGO_BIN_EXE_badag");

fn badag(args: &[&str]) -> Output {
    Command::new(BIN)
        .args(args)
        .output()
        .expect("badag should be runnable")
}

fn badag_in(cwd: &Path, args: &[&str]) -> Output {
    Command::new(BIN)
        .args(args)
        .current_dir(cwd)
        .output()
        .expect("badag should be runnable")
}

fn stdout_of(output: &Output) -> String {
    String::from_utf8(output.stdout.clone()).expect("output is UTF-8")
}

fn stderr_of(output: &Output) -> String {
    String::from_utf8(output.stderr.clone()).expect("output is UTF-8")
}

fn temp_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("badag-cli-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn dev_lists_scripts_from_the_working_directory_dags_folder() {
    let cwd = temp_dir("dev");
    let dags = cwd.join("dags");
    fs::create_dir(&dags).unwrap();
    for name in ["zeta.ts", "alpha.mjs", "middle.js", "readme.md", "logo.png"] {
        fs::write(dags.join(name), "").unwrap();
    }
    fs::create_dir_all(cwd.join("other")).unwrap();
    fs::write(cwd.join("other/ignored.ts"), "").unwrap();

    let output = badag_in(&cwd, &["dev"]);

    let expected = [
        Path::new("dags").join("alpha.mjs"),
        Path::new("dags").join("middle.js"),
        Path::new("dags").join("zeta.ts"),
    ];
    let expected: String = expected
        .iter()
        .map(|path| format!("{}\n", path.display()))
        .collect();

    assert!(output.status.success());
    assert_eq!(stdout_of(&output), expected);
    assert!(output.stderr.is_empty());

    fs::remove_dir_all(&cwd).unwrap();
}

#[test]
fn dev_fails_when_the_working_directory_has_no_dags_folder() {
    let cwd = temp_dir("no-dags");

    let output = badag_in(&cwd, &["dev"]);

    assert_eq!(output.status.code(), Some(1));
    assert!(output.stdout.is_empty());

    let stderr = stderr_of(&output);
    assert!(stderr.contains("failed to read dags"), "{stderr}");

    fs::remove_dir_all(&cwd).unwrap();
}

#[test]
fn dev_lists_the_typescript_dag_fixture() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/typescript-dag");

    let output = badag_in(&fixture, &["dev"]);

    let expected: String = ["branching.ts", "linear.ts", "scheduled.ts"]
        .iter()
        .map(|name| format!("{}\n", Path::new("dags").join(name).display()))
        .collect();

    assert!(output.status.success());
    assert_eq!(stdout_of(&output), expected);
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
    let stderr = stderr_of(&output);

    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty(), "no script may be written");
    assert!(stderr.contains("'tcsh'"), "{stderr}");
    assert!(
        stderr.contains("[possible values: bash, elvish, fish, nushell, powershell, zsh]"),
        "{stderr}"
    );
}
