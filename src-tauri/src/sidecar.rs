//! Spawns the Python sidecar (`uv run uvicorn …`) at app startup and ensures
//! it is killed when the app exits. In production (Phase 8) the bundled
//! PyInstaller binary will replace `uv run`, but the surface stays the same.

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

pub struct Sidecar {
    child: Mutex<Option<Child>>,
}

impl Sidecar {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }

    pub fn start(&self) -> Result<(), String> {
        let mut guard = self.child.lock().unwrap();
        if guard.is_some() {
            return Ok(());
        }
        // At dev time, `cargo run` invokes us from `src-tauri/` so the repo
        // root is the parent.  In a bundled build (Phase 8) the sidecar
        // binary will be located via Tauri's resolve_resource API instead.
        let cwd = std::env::current_dir().map_err(|e| format!("cwd: {e}"))?;
        let repo_root = cwd
            .parent()
            .ok_or_else(|| format!("no parent for {}", cwd.display()))?
            .to_path_buf();
        let backend = repo_root.join("backend");

        let child = Command::new("uv")
            .args([
                "run",
                "uvicorn",
                "paperpulse.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8765",
            ])
            .current_dir(&backend)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| format!("failed to spawn sidecar: {e}"))?;
        *guard = Some(child);
        Ok(())
    }

    pub fn stop(&self) {
        if let Some(mut child) = self.child.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        self.stop();
    }
}
