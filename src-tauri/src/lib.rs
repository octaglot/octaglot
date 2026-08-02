use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::Manager;

/// The bundled `content.db` is read-only inside the app bundle; pointing SQLite
/// at it blows up on the first write attempt. On first launch (and whenever the
/// content is updated) we copy it into a writable directory.
fn ensure_content_db(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let src = app
        .path()
        .resolve("resources/content.db", BaseDirectory::Resource)
        .map_err(|e| format!("resource not found: {e}"))?;

    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("no config directory: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("could not create directory: {e}"))?;
    let dst = dir.join("content.db");

    // A different size means the content was updated; overwrite it.
    let needs_copy = match (fs::metadata(&src), fs::metadata(&dst)) {
        (Ok(s), Ok(d)) => s.len() != d.len(),
        (Ok(_), Err(_)) => true,
        (Err(e), _) => return Err(format!("could not read resource: {e}")),
    };
    if needs_copy {
        fs::copy(&src, &dst).map_err(|e| format!("copy failed: {e}"))?;
    }
    Ok(dst)
}

#[tauri::command]
fn content_db_path(app: tauri::AppHandle) -> Result<String, String> {
    ensure_content_db(&app).map(|p| p.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // Ready before the frontend asks; on failure the command still reports it.
            let _ = ensure_content_db(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![content_db_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
