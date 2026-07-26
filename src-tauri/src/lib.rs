use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::Manager;

/// Paketlenmiş `content.db` uygulama paketinin içinde salt-okunurdur; SQLite'ı
/// oraya bağlamak yazma denemesinde patlar. İlk açılışta (ve içerik
/// güncellendiğinde) yazılabilir dizine kopyalıyoruz.
fn ensure_content_db(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let src = app
        .path()
        .resolve("resources/content.db", BaseDirectory::Resource)
        .map_err(|e| format!("kaynak bulunamadı: {e}"))?;

    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("yapılandırma dizini yok: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("dizin oluşturulamadı: {e}"))?;
    let dst = dir.join("content.db");

    // Boyut farklıysa içerik güncellenmiştir; üzerine yaz.
    let needs_copy = match (fs::metadata(&src), fs::metadata(&dst)) {
        (Ok(s), Ok(d)) => s.len() != d.len(),
        (Ok(_), Err(_)) => true,
        (Err(e), _) => return Err(format!("kaynak okunamadı: {e}")),
    };
    if needs_copy {
        fs::copy(&src, &dst).map_err(|e| format!("kopyalanamadı: {e}"))?;
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
            // Ön yüz sormadan önce hazır olsun; hata olursa komut yine bildirir.
            let _ = ensure_content_db(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![content_db_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
