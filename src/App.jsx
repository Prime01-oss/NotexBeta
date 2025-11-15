import React, { useState, useEffect } from 'react';
// These imports should now work because you have the component files
import { FileSidebar } from './components/FileSidebar'; 
import { Editor } from './components/Editor';
import { WindowControls } from './components/WindowControl';
import { NavigationBar } from './components/NavigationBar';
import { SettingsPanel } from './components/SettingsPanel';
import { ProfilePanel } from './components/ProfilePanel';
import { DrawingSpace } from './components/DrawingSpace'; // 💡 1. IMPORT DRAWING SPACE


// Helper function to find a node by its ID in the nested notes array
const findNodeById = (nodes, id) => {
    if (!nodes) return null;
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
    }
    return null;
};


function App() {
    // notes is now a nested array (the tree structure)
    const [notes, setNotes] = useState([]); 
    // selectedNote stores the full object: { id, title, type, path, children? }
    const [selectedNote, setSelectedNote] = useState(null); 
    const [currentNoteContent, setCurrentNoteContent] = useState('');
    
    // NEW GLOBAL STATE FOR UI
    const [activePanel, setActivePanel] = useState(null); // 'files', 'search', 'settings', or 'profile' (added profile)
    const [theme, setTheme] = useState('dark'); // 'dark' or 'light'
    const [notebookFont, setNotebookFont] = useState('sans'); // 'sans', 'serif', 'monospace'
    const [language, setLanguage] = useState('en'); // 'en', 'es', etc.


    // 1. Load the tree structure on app start
    useEffect(() => {
        loadNotesList();
    }, []);

    // 2. Load the content of the selected note
    useEffect(() => {
        // Only load content if the selected item is a 'note'
        if (selectedNote && selectedNote.type === 'note') {
            // Use the note's path to fetch content
            window.electronAPI.getNoteContent(selectedNote.path) 
                .then(content => setCurrentNoteContent(content || ''));
        } else {
            setCurrentNoteContent(''); // Clear editor for folders or nothing selected
        }
    }, [selectedNote]);
    
    // This effect manages the 'dark' class on the <html> tag
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]); // Re-run this effect whenever 'theme' changes

    // loadNotesList must return the Promise so we can chain it.
    const loadNotesList = () => {
        // Fetches the entire nested structure
        return window.electronAPI.getNotesList().then(newNotes => {
            setNotes(newNotes);
            
            // Re-select the previously selected item if it still exists in the new tree
            if (selectedNote) {
                const reSelectedNote = findNodeById(newNotes, selectedNote.id);
                if (reSelectedNote) {
                    // Important: Update selectedNote with the new object reference/paths
                    setSelectedNote(reSelectedNote); 
                } else {
                    setSelectedNote(null);
                }
            }
        });
    };

    const handleItemSelect = (item) => {
        setSelectedNote(item);
    };
    
    // --- Note/Folder Actions (FIXED ASYNC) ---

    // Accepts a third argument, `onComplete`, from the Sidebar/NewFolderInput.
    const handleFolderCreation = (parentPath, folderName, onComplete) => {
        if (folderName && folderName.trim() !== '') {
            // 1. Call Electron API and check the returned promise
            window.electronAPI.createFolder(parentPath, folderName)
                .then(result => {
                    // Assuming the Main Process returns { success: boolean, error?: string }
                    if (result && result.success) {
                        // 2. ONLY if successful, reload the list (which returns a Promise)
                        return loadNotesList(); 
                    } else {
                        // Handle Main Process error (e.g., Folder already exists)
                        alert(`Creation Failed: ${result ? result.error : 'Unknown error'}`);
                        // 3. Close the input box even on failure
                        if (onComplete) onComplete(); 
                        // Stop the promise chain here
                        throw new Error('Folder creation failed in Main Process.');
                    }
                })
                .then(() => {
                    // 4. Success: Notify the Sidebar to close the input after reload is complete
                    if (onComplete) onComplete();
                })
                .catch(error => {
                    // Catch network/API errors or the error thrown above
                    console.error("Folder creation failed:", error);
                    // Ensure cleanup happens if an error occurred before step 4
                    if (error.message.includes('Main Process') && onComplete) {
                        // This path is already handled above, but here for robustness.
                    } else if (onComplete) {
                        onComplete();
                    }
                });
        } else {
            // If name is empty, close the input immediately
            if (onComplete) onComplete(); 
        }
    };
    
    // The prop now expects the new 3-argument signature.
    const createFolder = handleFolderCreation;


    // 💡 UPDATED to match the new API and be consistent with folder creation
    // This no longer uses prompt()
    const createNote = (parentPath, noteTitle, onComplete) => {
        
        // 1. The title is now passed in, so we just check it.
        if (!noteTitle || noteTitle.trim() === '') {
            if (onComplete) onComplete(); // Call the onCancel callback
            return;
        }

        // 2. Call the API with the title from the sidebar
        window.electronAPI.createNote(parentPath, noteTitle)
            .then(result => {
                
                // 3. Check the new success object
                if (result && result.success) {
                    
                    // 4. Reload the list, which returns its own promise
                    return loadNotesList().then(() => {
                        // After the list is reloaded, select the new note
                        const newNoteInTree = findNodeById(notes, result.newNode.id);
                        setSelectedNote(newNoteInTree || result.newNode); 
                    });

                } else {
                    // Handle Main Process error (e.g., creation failed)
                    alert(`Creation Failed: ${result ? result.error : 'Unknown error'}`);
                    // Stop the promise chain
                    throw new Error('Note creation failed in Main Process.');
                }
            })
            .then(() => {
                // 5. Success: Call onComplete to close the input
                if (onComplete) onComplete();
            })
            .catch(error => {
                // 6. Error: Also call onComplete to close the input
                console.error("Note creation failed:", error);
                if (onComplete) onComplete(); // Always clean up the UI
            });
    };

    // 💡 NEW: Specific delete function for the sidebar
    const deleteItem = (itemToDelete) => {
        if (!itemToDelete) return;
        
        if (itemToDelete.type === 'folder' && !confirm(`Are you sure you want to delete the folder "${itemToDelete.title}" and all its contents?`)) {
            return;
        }
        if (itemToDelete.type === 'note' && !confirm(`Are you sure you want to delete the note "${itemToDelete.title}"?`)) {
            return;
        }

        window.electronAPI.deleteNote(itemToDelete.path, itemToDelete.type);
        
        if (selectedNote && selectedNote.id === itemToDelete.id) {
            setSelectedNote(null);
        }
        loadNotesList();
    };
    
    // 💡 NEW: Bulk delete function for the sidebar
    const deleteMultipleItems = async (items) => {
        if (!items || items.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${items.length} item(s)? This cannot be undone.`)) {
            return;
        }

        const deletePromises = items.map(item => {
            // Using return here to make sure we wait for all
            return window.electronAPI.deleteNote(item.path, item.type);
        });

        await Promise.all(deletePromises);

        if (selectedNote && items.some(item => item.id === selectedNote.id)) {
            setSelectedNote(null);
        }

        loadNotesList(); // Refresh the list
    };

    // 💡 RENAMED: This is the old deleteItem, now used by the Editor
    const deleteSelectedNote = () => {
        if (selectedNote) {
            deleteItem(selectedNote); // Calls the new deleteItem function
        }
    };

    const saveNote = () => {
        if (selectedNote && selectedNote.type === 'note') {
            window.electronAPI.saveNoteContent({ 
                id: selectedNote.id, 
                path: selectedNote.path, 
                content: currentNoteContent 
            });
        }
    };

    const updateItemTitle = (itemToUpdate, newTitle) => {
        if (!newTitle || itemToUpdate.title === newTitle) return;
        
        window.electronAPI.updateNoteTitle({ 
            id: itemToUpdate.id, 
            path: itemToUpdate.path, 
            newTitle, 
            type: itemToUpdate.type 
        });
        
        if (selectedNote && selectedNote.id === itemToUpdate.id) {
            setSelectedNote(prev => ({ ...prev, title: newTitle }));
        }

        loadNotesList();
    };


    return (
        // Root Div for light/dark mode
        <div className="flex flex-col h-screen relative bg-gray-100 text-gray-900 dark:bg-zinc-900 dark:text-white">
            
            {/* Header */}
            <header className="titlebar flex justify-between items-center p-3 pl-4 
                        bg-gray-200/80 border-b border-gray-300/50 
                        dark:bg-zinc-800/80 dark:border-zinc-700/50">
                <h1 className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tracking-wider">Notex</h1>
                <WindowControls />
            </header>

            {/* Main Content Area */}
            <main className="flex flex-1 overflow-hidden">
                
                {/* Navigation Bar (Fixed Left) */}
                <NavigationBar 
                    activePanel={activePanel}
                    onPanelClick={setActivePanel} // Pass the setter to toggle panels
                />
                
                {/* Conditional Side Panels: Container manages opening/closing animation */}
                <div className={`
                        flex-shrink-0 transition-all duration-300 ease-in-out
                        ${activePanel === 'files' || activePanel === 'settings' ? 'w-1/3 max-w-xs' : 'w-0 overflow-hidden'}
                        `}>
                    
                    {/* File Sidebar */}
                    {activePanel === 'files' && (
                        <FileSidebar
                            notes={notes}
                            selectedNote={selectedNote}
                            onItemSelect={handleItemSelect}
                            onCreateNote={createNote}
                            onCreateFolder={createFolder} 
                            onUpdateTitle={updateItemTitle}
                            onDeleteItem={deleteItem}               // 💡 ADDED PROP
                            onDeleteMultipleItems={deleteMultipleItems} // 💡 ADDED PROP
                        />
                    )}
                    
                    {/* Settings Panel */}
                    {activePanel === 'settings' && (
                        <SettingsPanel 
                            theme={theme}
                            setTheme={setTheme}
                            notebookFont={notebookFont}
                            setNotebookFont={setNotebookFont}
                            language={language}
                            setLanguage={setLanguage}
                        />
                    )}
                    
                </div>
                
                {/* 💡 2. Main Content: Editor OR Drawing Space */}
                {activePanel === 'draw' ? (
                    <DrawingSpace />
                ) : (
                    <Editor
                        content={currentNoteContent}
                        onChange={setCurrentNoteContent}
                        onSave={saveNote}
                        onDelete={selectedNote ? deleteSelectedNote : null}
                        isNoteSelected={selectedNote && selectedNote.type === 'note'}
                        selectedNote={selectedNote} 
                    />
                )}
            </main>

            {/* RENDER THE PROFILE PANEL HERE (outside 'main') */}
            {activePanel === 'profile' && <ProfilePanel 
                                            onClose={() => setActivePanel(null)} 
                                           />}
        </div>
    );
}

export default App;