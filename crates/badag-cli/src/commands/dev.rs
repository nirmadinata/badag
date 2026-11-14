use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, anyhow, bail};
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;

const DAGS_DIR: &str = "dags";
// DAG modules are imported as ESM; CommonJS files cannot contain a default export.
const SCRIPT_EXTENSIONS: [&str; 4] = ["js", "mjs", "ts", "mts"];

pub async fn run() -> Result<()> {
    let files = find_dag_files(Path::new(DAGS_DIR))?;

    for path in &files {
        println!("{}", path.display());
    }

    // Parse the DAG modules concurrently; joining in file order keeps output deterministic.
    let mut checks = Vec::with_capacity(files.len());
    for path in files {
        checks.push(tokio::spawn(async move {
            let result = check_default_export(&path).await;
            (path, result)
        }));
    }

    let mut violations = Vec::new();

    for check in checks {
        let (path, result) = check.await?;
        match result? {
            DefaultExport::Present => {}
            DefaultExport::Missing => {
                violations.push(format!("{}: missing default export", path.display()));
            }
            DefaultExport::Unparseable { errors } => {
                let suffix = if errors == 1 { "" } else { "s" };
                violations.push(format!(
                    "{}: failed to parse ({errors} syntax error{suffix})",
                    path.display()
                ));
            }
        }
    }

    if !violations.is_empty() {
        bail!("invalid DAG modules:\n{}", violations.join("\n"));
    }

    Ok(())
}

enum DefaultExport {
    Present,
    Missing,
    Unparseable { errors: usize },
}

async fn check_default_export(path: &Path) -> Result<DefaultExport> {
    let source_type = SourceType::from_path(path)
        .map_err(|error| anyhow!("{}: unsupported file type: {error}", path.display()))?;
    let source_text = tokio::fs::read_to_string(path)
        .await
        .with_context(|| format!("failed to read {}", path.display()))?;
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, &source_text, source_type).parse();

    if !parsed.diagnostics.is_empty() {
        return Ok(DefaultExport::Unparseable {
            errors: parsed.diagnostics.len(),
        });
    }

    // Export entries cover `export default`, `export { x as default }`, and
    // `export { default } from ...`; type-only exports are not runtime values.
    let present = parsed
        .module_record
        .local_export_entries
        .iter()
        .chain(parsed.module_record.indirect_export_entries.iter())
        .any(|entry| !entry.is_type && entry.export_name.default_export_span().is_some());

    Ok(if present {
        DefaultExport::Present
    } else {
        DefaultExport::Missing
    })
}

fn find_dag_files(dir: &Path) -> Result<Vec<PathBuf>> {
    let entries = fs::read_dir(dir).with_context(|| format!("failed to read {}", dir.display()))?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry?;
        if !has_script_extension(&entry.file_name()) {
            continue;
        }

        let path = entry.path();
        if path.is_file() {
            files.push(path);
        }
    }
    files.sort();

    Ok(files)
}

fn has_script_extension(file_name: &OsStr) -> bool {
    Path::new(file_name)
        .extension()
        .and_then(OsStr::to_str)
        .is_some_and(|extension| SCRIPT_EXTENSIONS.contains(&extension))
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::io::ErrorKind;
    use std::path::{Path, PathBuf};

    use super::{DefaultExport, check_default_export, find_dag_files};

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

        assert_eq!(file_names(&found), ["a.js", "b.ts", "c.mts", "e.mjs"]);

        fs::remove_dir_all(&dir).unwrap();
    }

    #[tokio::test]
    async fn accepts_every_default_export_form() {
        let dir = temp_dir("default-export-forms");
        let cases = [
            ("canonical.ts", "export default 1;\n"),
            ("aliased.ts", "const dag = 1;\nexport { dag as default };\n"),
            (
                "reexported.ts",
                "export { default } from \"./canonical.ts\";\n",
            ),
            (
                "starred.ts",
                "export * as default from \"./canonical.ts\";\n",
            ),
        ];

        for (name, source) in cases {
            let path = dir.join(name);
            fs::write(&path, source).unwrap();
            assert!(
                matches!(
                    check_default_export(&path).await.unwrap(),
                    DefaultExport::Present
                ),
                "{name} should be a default export"
            );
        }

        fs::remove_dir_all(&dir).unwrap();
    }

    #[tokio::test]
    async fn rejects_a_type_only_default_export() {
        let dir = temp_dir("default-export-type-only");
        let path = dir.join("declaration.ts");
        fs::write(&path, "export type { Dag as default } from \"./dag.ts\";\n").unwrap();

        assert!(matches!(
            check_default_export(&path).await.unwrap(),
            DefaultExport::Missing
        ));

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
