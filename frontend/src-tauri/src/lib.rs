use keyring::Entry;

#[tauri::command]
fn save_to_keychain(key: &str, secret: &str) -> Result<(), String> {
    let entry = Entry::new("x402-forge-wallet", key).map_err(|e| e.to_string())?;
    entry.set_password(secret).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_from_keychain(key: &str) -> Result<String, String> {
    let entry = Entry::new("x402-forge-wallet", key).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
fn erase_from_keychain(key: &str) -> Result<(), String> {
    let entry = Entry::new("x402-forge-wallet", key).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|_| "No key found".to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        save_to_keychain,
        get_from_keychain,
        erase_from_keychain
    ])
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
