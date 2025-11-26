const { contextBridge, ipcRenderer } = require('electron');

// Securely expose a global API to your renderer process (the UI)
contextBridge.exposeInMainWorld('electronAPI', {
    // ... (existing controls: close, minimize, etc.)
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),

    // --- NEW: Maximize State Sync ---
    checkMaximized: () => ipcRenderer.invoke('is-maximized'),
    
    // This allows us to listen for events and clean them up automatically
    onWindowMaximized: (callback) => {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on('window-maximized', subscription);
        return () => ipcRenderer.removeListener('window-maximized', subscription);
    },
    onWindowUnmaximized: (callback) => {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on('window-unmaximized', subscription);
        return () => ipcRenderer.removeListener('window-unmaximized', subscription);
    },

    // --- UPDATED Notes Functions for Tree Structure ---
    getNotesList: () => ipcRenderer.invoke('get-notes-list'), // Fetches the nested tree
    getNoteContent: (notePath) => ipcRenderer.invoke('get-note-content', notePath), // Uses path
    saveNoteContent: (note) => ipcRenderer.send('save-note-content', note), // Note object: { id, path, content }
    updateNoteTitle: (item) => ipcRenderer.invoke('update-note-title', item), // Item object: { id, path, newTitle, type }
    createNote: (parentPath, noteTitle) => ipcRenderer.invoke('create-note', parentPath, noteTitle), deleteNote: (itemPath, type) => ipcRenderer.send('delete-note', itemPath, type), // Uses path and type

    // --- NEW Folder Function (FIXED) ---
    // 💡 FIX 1: Changed to ipcRenderer.invoke() to enable Promise handling in App.jsx.
    // 💡 FIX 2: Changed channel name to 'fs:create-folder' to match main.js.
    createFolder: (parentPath, folderName) => ipcRenderer.invoke('fs:create-folder', parentPath, folderName),

    // --- Reminders Functions (Unchanged) ---
    loadReminders: () => ipcRenderer.invoke('load-reminders'),
    saveReminders: (reminders) => ipcRenderer.send('save-reminders', reminders),
    showNotification: (title, desc) => ipcRenderer.send('show-notification', title, desc),
    // 💡 ADD THESE TWO LINES FOR SETTINGS
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings)
});