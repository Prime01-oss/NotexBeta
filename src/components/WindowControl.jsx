import React, { useState, useEffect } from 'react';

// --- Icons (Same as before) ---
const MinimizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" fill="none">
    <path d="M1 6H11" strokeLinecap="round" />
  </svg>
);

const MaximizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
  </svg>
);

const RestoreIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" fill="none">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <path d="M8.5 3.5V2.5C8.5 1.94772 8.05228 1.5 7.5 1.5H2.5C1.94772 1.5 1.5 1.94772 1.5 2.5V7.5C1.5 8.05228 1.94772 8.5 2.5 8.5H3.5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" fill="none">
    <path d="M1 1L11 11M1 11L11 1" strokeLinecap="round" />
  </svg>
);

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  // --- NEW: Sync State on Load & Change ---
  useEffect(() => {
    // 1. Check initial state immediately (Fixes the reload issue)
    if (window.electronAPI.checkMaximized) {
        window.electronAPI.checkMaximized().then(setIsMaximized);
    }

    // 2. Listen for external changes (Snap Layouts, Dragging, etc.)
    // These functions might be undefined if you haven't updated preload.js yet
    if (window.electronAPI.onWindowMaximized && window.electronAPI.onWindowUnmaximized) {
        const removeMax = window.electronAPI.onWindowMaximized(() => setIsMaximized(true));
        const removeUnmax = window.electronAPI.onWindowUnmaximized(() => setIsMaximized(false));

        return () => {
            removeMax();
            removeUnmax();
        };
    }
  }, []);

  const handleMinimize = () => window.electronAPI.minimizeWindow();
  
  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
    // No need to manually toggle here; the event listeners above will catch it.
  };
  
  const handleClose = () => window.electronAPI.closeWindow();

  const baseBtn =
    'no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 ' +
    'text-gray-500 dark:text-gray-400 hover:scale-105 active:scale-95';

  return (
    <div
      className="flex items-center space-x-1 px-1.5 py-0.5 rounded-lg 
                 backdrop-blur-md bg-white/60 dark:bg-zinc-800/60 
                 border border-gray-200/60 dark:border-zinc-700/50 shadow-sm"
    >
      {/* 1. Minimize */}
      <button
        onClick={handleMinimize}
        className={`${baseBtn} hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-600`}
        title="Minimize"
      >
        <MinimizeIcon />
      </button>

      {/* 2. Maximize / Restore */}
      <button
        onClick={handleMaximize}
        className={`${baseBtn} hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600`}
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>

      {/* 3. Close */}
      <button
        onClick={handleClose}
        className={`${baseBtn} hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600`}
        title="Close"
      >
        <CloseIcon />
      </button>
    </div>
  );
}