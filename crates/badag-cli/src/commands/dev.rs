use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, anyhow, bail};
use oxc_allocator::Allocator;
use oxc_ast::ast::{
    BindingPattern, Declaration, Expression, Program, Statement, TSType, TSTypeAnnotation,
    TSTypeName,
};
use oxc_parser::Parser;
use oxc_span::SourceType;
use rayon::prelude::*;

const DAGS_DIR: &str = "dags";
// DAG modules are imported as ESM; CommonJS files cannot contain a default export.
const SCRIPT_EXTENSIONS: [&str; 4] = ["js", "mjs", "ts", "mts"];

pub fn run() -> Result<()> {
    let files = find_dag_files(Path::new(DAGS_DIR))?;

    for path in &files {
        println!("{}", path.display());
    }

    let checks: Vec<Result<Option<String>>> = files
        .par_iter()
        .map(|path| check_dag_module(path))
        .collect();

    let mut violations = Vec::new();
    for (path, check) in files.iter().zip(checks) {
        if let Some(message) = check? {
            violations.push(format!("{}: {message}", path.display()));
        }
    }

    if !violations.is_empty() {
        bail!("invalid DAG modules:\n{}", violations.join("\n"));
    }

    Ok(())
}

fn check_dag_module(path: &Path) -> Result<Option<String>> {
    let source_type = SourceType::from_path(path)
        .map_err(|error| anyhow!("{}: unsupported file type: {error}", path.display()))?;
    let source =
        fs::read_to_string(path).with_context(|| format!("failed to read {}", path.display()))?;
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, &source, source_type).parse();

    if !parsed.diagnostics.is_empty() {
        let errors = parsed.diagnostics.len();
        let suffix = if errors == 1 { "" } else { "s" };
        return Ok(Some(format!(
            "failed to parse ({errors} syntax error{suffix})"
        )));
    }

    // Export entries cover `export default`, `export { x as default }`, and
    // `export { default } from ...`; type-only exports are not runtime values.
    let exports_default = parsed
        .module_record
        .local_export_entries
        .iter()
        .chain(parsed.module_record.indirect_export_entries.iter())
        .any(|entry| !entry.is_type && entry.export_name.default_export_span().is_some());

    if !exports_default {
        return Ok(Some("missing default export".to_owned()));
    }

    if !exports_dag(&parsed.program) {
        return Ok(Some("default export is not a DAG".to_owned()));
    }

    Ok(None)
}

// OXC parses but does not typecheck, so `DAG` is inferred from an explicit
// annotation or from an initializer rooted in `createDAG(...)`.
fn exports_dag(program: &Program<'_>) -> bool {
    for statement in &program.body {
        match statement {
            Statement::ExportDefaultDeclaration(export) => {
                return export
                    .declaration
                    .as_expression()
                    .is_some_and(|expression| expression_is_dag(program, expression));
            }
            Statement::ExportNamedDeclaration(export) => {
                for specifier in &export.specifiers {
                    if specifier.exported.name() == "default" {
                        return specifier
                            .local
                            .identifier_name()
                            .is_some_and(|name| declared_as_dag(program, name.as_str()));
                    }
                }
            }
            _ => {}
        }
    }

    false
}

fn expression_is_dag(program: &Program<'_>, expression: &Expression<'_>) -> bool {
    match unwrap_expression(expression) {
        Expression::Identifier(identifier) => declared_as_dag(program, identifier.name.as_str()),
        expression => is_create_dag_chain(expression),
    }
}

fn declared_as_dag(program: &Program<'_>, name: &str) -> bool {
    for statement in &program.body {
        let declaration = match statement {
            Statement::VariableDeclaration(declaration) => Some(declaration),
            Statement::ExportDeclaration(export) => match &export.declaration {
                Declaration::VariableDeclaration(declaration) => Some(declaration),
                _ => None,
            },
            _ => None,
        };

        let Some(declaration) = declaration else {
            continue;
        };

        for declarator in &declaration.declarations {
            let BindingPattern::BindingIdentifier(identifier) = &declarator.id else {
                continue;
            };

            if identifier.name == name {
                return declarator
                    .type_annotation
                    .as_deref()
                    .is_some_and(is_dag_type)
                    || declarator
                        .init
                        .as_ref()
                        .is_some_and(|init| is_create_dag_chain(init));
            }
        }
    }

    false
}

fn is_dag_type(annotation: &TSTypeAnnotation<'_>) -> bool {
    let TSType::TSTypeReference(reference) = &annotation.type_annotation else {
        return false;
    };

    match &reference.type_name {
        TSTypeName::IdentifierReference(identifier) => identifier.name == "DAG",
        TSTypeName::QualifiedName(name) => name.right.name == "DAG",
        TSTypeName::ThisExpression(_) => false,
    }
}

fn is_create_dag_chain(expression: &Expression<'_>) -> bool {
    let Expression::CallExpression(call) = unwrap_expression(expression) else {
        return false;
    };

    match unwrap_expression(&call.callee) {
        Expression::Identifier(identifier) => identifier.name == "createDAG",
        Expression::StaticMemberExpression(member) => {
            member.property.name == "createDAG" || is_create_dag_chain(&member.object)
        }
        _ => false,
    }
}

fn unwrap_expression<'a, 'b>(expression: &'b Expression<'a>) -> &'b Expression<'a> {
    match expression {
        Expression::ParenthesizedExpression(inner) => unwrap_expression(&inner.expression),
        Expression::TSAsExpression(inner) => unwrap_expression(&inner.expression),
        Expression::TSSatisfiesExpression(inner) => unwrap_expression(&inner.expression),
        Expression::TSNonNullExpression(inner) => unwrap_expression(&inner.expression),
        _ => expression,
    }
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

    use super::{check_dag_module, find_dag_files};

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("badag-dev-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_source(dir: &Path, name: &str, source: &str) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, source).unwrap();
        path
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

    #[test]
    fn accepts_dag_default_exports() {
        let dir = temp_dir("dag");

        for (name, source) in [
            ("canonical.ts", "export default createDAG(\"x\");\n"),
            ("chained.ts", "export default createDAG(\"x\").chain();\n"),
            (
                "aliased.ts",
                "const dag = createDAG(\"x\");\nexport { dag as default };\n",
            ),
            (
                "annotated.ts",
                "const dag: DAG = makeDag();\nexport default dag;\n",
            ),
            (
                "namespace.ts",
                "import * as sdk from \"@badag/sdk\";\nexport default sdk.createDAG(\"x\");\n",
            ),
        ] {
            let path = write_source(&dir, name, source);
            assert_eq!(check_dag_module(&path).unwrap(), None, "{name}");
        }

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn rejects_default_exports_that_are_not_dags() {
        let dir = temp_dir("not-dag");

        for (name, source) in [
            ("object.ts", "export default {};\n"),
            ("number.ts", "export default 1;\n"),
            ("variable.ts", "const dag = 1;\nexport default dag;\n"),
            ("function.ts", "export default function makeDag() {}\n"),
            ("reexported.ts", "export { default } from \"./other.ts\";\n"),
        ] {
            let path = write_source(&dir, name, source);
            assert_eq!(
                check_dag_module(&path).unwrap().as_deref(),
                Some("default export is not a DAG"),
                "{name}"
            );
        }

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn treats_type_only_default_export_as_missing() {
        let dir = temp_dir("type-only");
        let path = write_source(
            &dir,
            "declaration.ts",
            "export type { Dag as default } from \"./dag.ts\";\n",
        );

        assert_eq!(
            check_dag_module(&path).unwrap().as_deref(),
            Some("missing default export")
        );

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn reports_syntax_errors() {
        let dir = temp_dir("syntax");
        let path = write_source(&dir, "broken.ts", "export default ;\n");

        let violation = check_dag_module(&path).unwrap().unwrap();
        assert!(violation.starts_with("failed to parse"), "{violation}");

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
