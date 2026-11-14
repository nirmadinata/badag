use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};

const DAGS_DIR: &str = "dags";
const SCRIPT_EXTENSIONS: [&str; 6] = ["js", "mjs", "cjs", "ts", "mts", "cts"];

pub fn run() -> Result<()> {
    for path in find_dag_files(Path::new(DAGS_DIR))? {
        println!("{}", path.display());
    }

    Ok(())
}

fn find_dag_files(dir: &Path) -> Result<Vec<PathBuf>> {
    let entries = fs::read_dir(dir).with_context(|| format!("failed to read {}", dir.display()))?;

    let mut files = Vec::new();
    for entry in entries {
        let path = entry?.path();
        if path.is_file() && has_script_extension(&path) {
            files.push(path);
        }
    }
    files.sort();

    Ok(files)
}

fn has_script_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            SCRIPT_EXTENSIONS
                .iter()
                .any(|known| extension.eq_ignore_ascii_case(known))
        })
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::io::ErrorKind;
    use std::path::{Path, PathBuf};

    use super::find_dag_files;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("badag-dev-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn file_names(paths: &[PathBuf]) -> Vec<String> {
        paths
            .iter()
            .map(|path| path.file_name().unwrap().to_string_lossy().into_owned())
            .collect()
    }

    #[test]
    fn finds_scripts_sorted_and_skips_other_entries() {
        let dir = temp_dir("scan");
        for name in [
            "b.ts",
            "a.js",
            "c.mts",
            "d.cts",
            "e.mjs",
            "f.cjs",
            "g.TS",
            "notes.md",
            "dags.json",
        ] {
            fs::write(dir.join(name), "").unwrap();
        }
        fs::create_dir(dir.join("nested.ts")).unwrap();

        let found = find_dag_files(&dir).unwrap();

        assert_eq!(
            file_names(&found),
            ["a.js", "b.ts", "c.mts", "d.cts", "e.mjs", "f.cjs", "g.TS"]
        );

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn missing_directory_names_the_path_and_keeps_the_cause() {
        let root = temp_dir("missing");
        let dir = root.join("absent");

        let error = find_dag_files(&dir).unwrap_err();
        let displayed = dir.display().to_string();

        assert!(error.to_string().contains(&displayed), "{error}");
        assert!(
            error
                .downcast_ref::<std::io::Error>()
                .is_some_and(|cause| cause.kind() == ErrorKind::NotFound),
            "{error:#}"
        );

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn empty_directory_has_no_files() {
        let dir = temp_dir("empty");

        assert!(find_dag_files(Path::new(&dir)).unwrap().is_empty());

        fs::remove_dir_all(&dir).unwrap();
    }
}
