// path: src/components/Editor.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';

/* =========================
   Icons (merged & consistent)
   ========================= */
const icons = {
  bold: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
      <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  underline: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15v3a6 6 0 006 6v0a6 6 0 006-6v-3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  ),
  trash: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  check: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  file: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  ),
};

/* =========================
   MenuBar component
   ========================= */
const MenuBar = ({ editor, onSave, onDelete, isNoteSelected, createdAt }) => {
  if (!editor) return null;

  const fontOptions = [
    { label: 'Sans (Default)', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive, sans-serif' },
  ];

  const getHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    return 'Normal';
  };

  const btnClass = (isActive) =>
    `p-2 h-9 rounded transition-colors flex items-center justify-center gap-2
     ${isActive ? 'bg-blue-600 text-white dark:bg-blue-500' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-zinc-700/40'}`;

  const selectClass =
    'px-3 h-9 rounded text-sm bg-gray-100 dark:bg-zinc-800 border border-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-gray-100';

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-700
                    backdrop-blur-lg bg-white/60 dark:bg-zinc-900/50 sticky top-0 z-20 shadow-sm">
      {/* Left controls */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={getHeading()}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'Normal') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val[1]) }).run();
          }}
        >
          <option value="Normal">Normal Text</option>
          <option value="H1">Heading 1</option>
          <option value="H2">Heading 2</option>
          <option value="H3">Heading 3</option>
        </select>

        <select
          className={selectClass + ' min-w-[150px]'}
          defaultValue="sans-serif"
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'sans-serif') {
              editor.chain().focus().unsetFontFamily?.().run?.();
            } else {
              editor.chain().focus().setFontFamily(val).run();
            }
          }}
        >
          {fontOptions.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1" />

        <button title="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}>
          {icons.bold}
        </button>
        <button title="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}>
          {icons.italic}
        </button>
        <button title="Underline (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))}>
          {icons.underline}
        </button>
      </div>

      {/* Right controls */}
      {isNoteSelected ? (
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-xs text-gray-600 dark:text-gray-300 mr-2">
            {createdAt && (
              <span className="flex items-center gap-1 leading-tight">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l3 3" />
                </svg>
                <span>{createdAt}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              title="Delete note"
              className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600"
            >
              <span className="sr-only">Delete</span>
              {icons.trash}
              {/* <span className="hidden md:inline text-sm font-medium"></span> */}
            </button>

            <button
              onClick={onSave}
              title="Save note"
              className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-emerald-600"
            >
              <span className="sr-only">Save</span>
              {icons.check}
              {/* <span className="hidden md:inline text-sm font-medium">Save</span> */}
            </button>
          </div>
        </div>
      ) : (
        <div /> /* keep spacing when nothing is selected */
      )}
    </div>
  );
};

/* =========================
   Editor component
   ========================= */
export function Editor({ content, onChange, onSave, onDelete, isNoteSelected, selectedNote }) {
  // Formatted createdAt (human readable)
  const [createdAt, setCreatedAt] = useState(null);

  useEffect(() => {
    if (selectedNote?.createdAt) {
      const d = new Date(selectedNote.createdAt);
      const formatted = d.toLocaleString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      setCreatedAt(formatted);
    } else {
      setCreatedAt(null);
    }
  }, [selectedNote]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Underline,
        // TextStyle must come before FontFamily so FontFamily applies to textStyle nodes
        TextStyle,
        FontFamily.configure({
          types: ['textStyle'],
          // fonts listed here correspond to select options values
          fonts: [
            'sans-serif',
            'serif',
            'monospace',
            'Arial, sans-serif',
            'Georgia, serif',
            '"Courier New", monospace',
            '"Times New Roman", serif',
            'Verdana, sans-serif',
            '"Comic Sans MS", cursive, sans-serif',
          ],
        }),
      ],
      content: typeof content === 'string' ? content : '',
      editable: !!isNoteSelected,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class:
            'prose prose-gray dark:prose-invert max-w-none focus:outline-none text-[1.06rem] leading-[1.75] font-[450] tracking-wide w-full h-full px-8 py-6 sm:px-12 sm:py-10',
        },
      },
    },
    // Recreate editor when isNoteSelected changes (makes editable toggle reliable)
    [isNoteSelected]
  );

  // Sync external content into editor if it changed externally
  useEffect(() => {
    if (editor && isNoteSelected && typeof content === 'string' && content !== editor.getHTML()) {
      // false => do not emit update transaction to avoid cycles
      editor.commands.setContent(content || '', false, { preserveCursor: false });
    }
  }, [content, isNoteSelected, editor]);

  // Keyboard shortcuts: optional — ensure default tiptap keys still work
  const renderEmptyState = useCallback(() => {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center px-6 -translate-x-9">
          <p className="text-xl font-light text-gray-500 dark:text-gray-400 mb-2">
            <span className="inline-flex items-center gap-2 justify-center">
             
              <span className="font-semibold">Select a note from</span>
               {icons.file}
              <span className="font-semibold">Files</span>
            </span>
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">or create a new one to begin editing.</p>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 relative min-h-[320px]">
      {/* Menu bar */}
      {editor && isNoteSelected && <MenuBar editor={editor} onSave={onSave} onDelete={onDelete} isNoteSelected={isNoteSelected} createdAt={createdAt} />}

      {/* Editor content or empty state */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full h-full">
          {isNoteSelected && editor ? (
            <div className="min-h-[320px] p-4 sm:p-6">
              <EditorContent editor={editor} />
            </div>
          ) : (
            <div className="h-[360px] flex items-center justify-center">{renderEmptyState()}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Editor;
