# Electron Archive

This directory preserves the original Electron implementation that was removed during the web migration for Vercel.

- main/ — Electron main process (BrowserWindow, ipcMain, dialogs, filesystem)
- preload/ — contextBridge / ipcRenderer preload
- electron.vite.config.ts — previous electron-vite config
- electron-builder.yml — electron-builder packaging config
- 	sconfig.node.json — TypeScript config for main/preload

The web build no longer uses any of these files. They are kept for reference or if a desktop build is needed again.

