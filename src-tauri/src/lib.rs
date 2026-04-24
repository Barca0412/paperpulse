mod sidecar;

use sidecar::Sidecar;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sc = Sidecar::new();
    sc.start().expect("failed to start python sidecar");

    tauri::Builder::default()
        .manage(sc)
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(sc) = window.app_handle().try_state::<Sidecar>() {
                    sc.stop();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
