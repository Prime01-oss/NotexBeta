const { app, BrowserWindow, ipcMain, Notification, session } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('node:crypto');

// --- Define persistent file paths (Unchanged) ---
const userDataPath = app.getPath('userData');
const notesDir = path.join(userDataPath, 'Notes');
const remindersFilePath = path.join(userDataPath, 'reminders.json');
const settingsFilePath = path.join(userDataPath, 'settings.json'); // 💡 ADD THIS

ipcMain.handle('load-settings', async () => {
    try {
        const data = await fs.readFile(settingsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // If file doesn't exist or is corrupt, return defaults
        return {
            theme: 'dark',
            notebookFont: 'sans',
            language: 'en',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }
});

// 💡 ADD THIS HANDLER TO SAVE SETTINGS
ipcMain.on('save-settings', async (event, settings) => {
    try {
        await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2));
    } catch (err) {
        console.error('Failed to save settings:', err);
    }
});

// --- Helper functions (Unchanged) ---
async function ensureNotesDirExists() {
    try {
        await fs.stat(notesDir);
    } catch (err) {
        await fs.mkdir(notesDir);
    }
}

// --- NEW RECURSIVE FILE SCANNER ---
async function scanNotesDir(currentPath, baseDir) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const tree = [];

    for (const entry of entries) {
        // Ignore hidden files
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
            const children = await scanNotesDir(fullPath, baseDir);
            tree.push({
                id: relativePath,
                title: entry.name,
                type: 'folder',
                path: relativePath,
                children: children
            });
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            try {
                const fileData = await fs.readFile(fullPath, 'utf8');
                const note = JSON.parse(fileData);

                tree.push({
                    id: note.id, // Keep the UUID as the canonical ID
                    title: note.title,
                    type: 'note',
                    path: relativePath, // Relative path for file operations
                    createdAt: note.createdAt || null // 💡 FIX 1: Read the creation time
                });
            } catch (err) {
                console.error(`Error reading note file ${entry.name} at ${relativePath}:`, err);
            }
        }
    }
    return tree.sort((a, b) => {
        // Sort folders before notes, then alphabetically
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
    });
}
// --- END NEW HELPER ---

let mainWindow;

function createWindow() {
    // --- FIX: RESTORED preloadScript DECLARATION ---
    const preloadScript = app.isPackaged
        ? path.join(__dirname, '../preload/preload.js') // Production path
        : path.join(__dirname, 'preload.js');        // Development path
    // --- END FIX ---

    mainWindow = new BrowserWindow({
        width: 1300,
        height: 1650,
        minWidth: 800,
        minHeight: 600,
        // icon: getIconPath(),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: preloadScript
        },
        frame: false,
        transparent: true,
        titleBarStyle: 'hidden',
        vibrancy: 'ultra-dark',
        backgroundColor: '#00000000',
        show: false
    });
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximized');
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-unmaximized');
    });

    // --- UPDATED LOADING LOGIC (THE FIX) ---
    const devServerURL = 'http://localhost:5173'; // Default Vite port

    if (!app.isPackaged) {
        console.log('[DEBUG] Loading Dev Server URL: ' + devServerURL);
        mainWindow.loadURL(devServerURL);
    } else {
        console.log('[DEBUG] Loading Production File');
        // This path is for production builds
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    // --- END LOGIC ---


    // --- 'show-notification' handler (Unchanged) ---
    ipcMain.on('show-notification', (event, title, description) => {
        const iconPath = app.isPackaged
            ? path.join(__dirname, '../renderer/notezone.png') // Prod path
            : path.join(__dirname, 'public/notezone.png');    // Dev path (assumes icon is in /public)

        const notification = new Notification({
            title,
            body: description,
            icon: iconPath
        });
        notification.show();
    });

    // --- Window Control Handlers (Unchanged) ---
    ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    
    ipcMain.on('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });
    ipcMain.on('maximize-window', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    // --- UPDATED Notes Handlers to support Tree Structure (Unchanged) ---

    // 1. Get Notes List (now returns a nested tree)
    ipcMain.handle('get-notes-list', async () => {
        await ensureNotesDirExists();
        return scanNotesDir(notesDir, notesDir); // Use new recursive scanner
    });

    // 2. Get Note Content (uses notePath)
    ipcMain.handle('get-note-content', async (event, notePath) => {
        await ensureNotesDirExists();
        const fullPath = path.join(notesDir, notePath); // Use full path
        try {
            const fileData = await fs.readFile(fullPath, 'utf8');
            const note = JSON.parse(fileData);
            return note.content;
        } catch (err) {
            console.error(`Error reading note at ${notePath}:`, err);
            return null;
        }
    });

    // 3. Save Note Content (uses notePath)
    ipcMain.on('save-note-content', async (event, { id, path: notePath, content }) => {
        await ensureNotesDirExists();
        const fullPath = path.join(notesDir, notePath); // Use full path
        try {
            const fileData = await fs.readFile(fullPath, 'utf8');
            const note = JSON.parse(fileData);
            note.content = content;
            await fs.writeFile(fullPath, JSON.stringify(note, null, 2));
        } catch (err) {
            console.error(`Error saving note at ${notePath}:`, err);
        }
    });

    // 4. Update Item Title (for notes and folders)
    ipcMain.handle('update-note-title', async (event, { id, path: oldPath, newTitle, type }) => {
        await ensureNotesDirExists();
        const oldFullPath = path.join(notesDir, oldPath);

        // Sanitize new title to prevent path traversal
        newTitle = newTitle.replace(/[^a-zA-Z0-9\s-_.]/g, '').trim() || 'Untitled';

        if (type === 'folder') {
            // Rename the directory on the file system
            const newFullPath = path.join(path.dirname(oldFullPath), newTitle);
            // Prevent renaming to the same name or an empty name
            if (oldFullPath === newFullPath) return;

            try {
                await fs.rename(oldFullPath, newFullPath);
            } catch (err) {
                console.error(`Error renaming folder ${oldPath}:`, err);
            }
        } else if (type === 'note') {
            // A note's title is stored inside its JSON file
            try {
                const fileData = await fs.readFile(oldFullPath, 'utf8');
                const note = JSON.parse(fileData);
                note.title = newTitle; // Update the title property
                await fs.writeFile(oldFullPath, JSON.stringify(note, null, 2));
            } catch (err) {
                console.error(`Error updating title for note ${id}:`, err);
            }
        }
    });

    // 5. Create Note (MODIFIED to accept a title)
    ipcMain.handle('create-note', async (event, parentPath = '.', noteTitle) => {
        await ensureNotesDirExists();

        // 1. Sanitize the title, just like you do for folders
        const sanitizedTitle = String(noteTitle || 'New Note')
            .replace(/[^a-zA-Z0-9\s-_.]/g, '')
            .trim() || 'New Note'; // Fallback to 'New Note' if sanitization leaves it empty

        const fullDirPath = path.join(notesDir, parentPath);

        const newNote = {
            id: crypto.randomUUID(),
            title: sanitizedTitle, // <--- Use the new sanitized title
            content: '',
            createdAt: new Date().toISOString() // 💡 FIX 2: Save the creation time
        };
        // The filename is still the UUID, which is smart!
        // This means you can have multiple notes with the same title.
        const fileName = `${newNote.id}.json`;
        const filePath = path.join(fullDirPath, fileName);

        try {
            await fs.mkdir(fullDirPath, { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(newNote, null, 2));

            const relativePath = path.relative(notesDir, filePath);

            // 2. Return a success object (consistent with fs:create-folder)
            return {
                success: true,
                newNode: { // Send back the new node data
                    id: newNote.id,
                    title: newNote.title,
                    type: 'note',
                    path: relativePath,
                    createdAt: newNote.createdAt // 💡 FIX 3: Return the creation time to the app
                }
            };
        } catch (err) {
            console.error('Error creating new note:', err);

            // 3. Return a failure object (consistent with fs:create-folder)
            return {
                success: false,
                error: `Failed to create note: ${err.message}`
            };
        }
    });

    // 6. Delete Note/Folder (uses path and type)
    ipcMain.on('delete-note', async (event, itemPath, type) => {
        await ensureNotesDirExists();
        const fullPath = path.join(notesDir, itemPath); // Use full path
        try {
            if (type === 'folder') {
                // Recursively remove directory
                await fs.rm(fullPath, { recursive: true, force: true });
            } else {
                // Delete note file
                await fs.unlink(fullPath);
            }
        } catch (err) {
            console.error(`Error deleting item at ${itemPath}:`, err);
        }
    });

    // 7. NEW: Create Folder
    ipcMain.handle('fs:create-folder', async (event, parentPath, folderName) => {
        // 1. Ensure the root notes directory exists
        await ensureNotesDirExists();

        // 2. Sanitize folderName (Good practice!)
        folderName = String(folderName || '')
            .replace(/[^a-zA-Z0-9\s-_.]/g, '')
            .trim();

        // Prevent creating a folder with an invalid or empty name after sanitization
        if (!folderName) {
            return { success: false, error: 'Invalid folder name provided.' };
        }

        // 3. Construct the full path
        // path.join handles the parentPath being empty or containing separators
        const fullPath = path.join(notesDir, parentPath || '', folderName);

        try {
            // 4. Create the directory (with recursive option)
            await fs.mkdir(fullPath, { recursive: true });

            // 5. Return success result
            return {
                success: true,
                path: fullPath,
                message: `Folder '${folderName}' created successfully.`
            };

        } catch (err) {
            // Log the detailed error in the Main Process console
            console.error(`Error creating folder ${fullPath}:`, err);

            // 6. Return failure result with a user-friendly error message
            return {
                success: false,
                error: `Failed to create folder: ${err.code === 'EEXIST' ? 'Folder already exists.' : err.message}`
            };
        }
    });
    // --- Reminders Handlers (Unchanged) ---
    ipcMain.handle('load-reminders', async () => {
        try {
            const data = await fs.readFile(remindersFilePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            await fs.writeFile(remindersFilePath, JSON.stringify([]));
            return [];
        }
    });
    ipcMain.on('save-reminders', async (event, reminders) => {
        await fs.writeFile(remindersFilePath, JSON.stringify(reminders));
    });


    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- UPDATED APP READY HANDLER (FIXED CSP) ---
app.on('ready', () => {
    session.defaultSession.clearCache();

    if (!app.isPackaged) {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: http://localhost:5173 ws://localhost:5173 https://cdn.tldraw.com https://unpkg.com https://esm.sh; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 https://esm.sh https://unpkg.com; " +
                        // --- START OF FIX ---
                        "style-src 'self' 'unsafe-inline' blob: data: https://unpkg.com https://esm.sh https://fonts.googleapis.com; " +
                        "font-src 'self' data: blob: https://cdn.tldraw.com https://unpkg.com https://esm.sh https://fonts.gstatic.com; " +
                        // --- END OF FIX ---
                        "img-src 'self' data: blob: https://cdn.tldraw.com https://unpkg.com https://esm.sh; " +
                        "connect-src 'self' http://localhost:5173 ws://localhost:5173 https://cdn.tldraw.com https://unpkg.com https://esm.sh;" +
                        "frame-src 'self' https://www.youtube.com https://youtube.com;"
                    ]
                }
            });
        });
    // --- FIX: BUG #2 ---
    // Added 'else' block for production CSP
    } else {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.tldraw.com https://unpkg.com https://esm.sh; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://unpkg.com; " +
                        // --- START OF FIX ---
                        "style-src 'self' 'unsafe-inline' blob: data: https://unpkg.com https://esm.sh https://fonts.googleapis.com; " +
                        "font-src 'self' data: blob: https://cdn.tldraw.com https://unpkg.com https://esm.sh https://fonts.gstatic.com; " +
                        // --- END OF FIX ---
                        "img-src 'self' data: blob: https://cdn.tldraw.com https://unpkg.com https://esm.sh; " +
                        "connect-src 'self' https://cdn.tldraw.com https://unpkg.com https://esm.sh;" +
                        "frame-src 'self' https://www.youtube.com https://youtube.com;"
                    ]
                }
            });
        });
    }

    ensureNotesDirExists();
    createWindow();
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});