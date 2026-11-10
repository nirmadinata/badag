use crate::commands::Result;

pub const NAME: &str = "dev";

pub async fn run() -> Result<()> {
    println!("hello from {NAME}");
    Ok(())
}
