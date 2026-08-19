'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The shared parts of a written surface: the caret handling, the toolbar
 * controls and the icons. The email composer and the note editor differ in
 * which buttons they show, not in how any of them behave.
 */

export const FONTS = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

export const SIZES = ['12', '14', '16', '18', '20', '24', '28', '32'];

export const TEXT_COLOURS = [
  '#1A1A1A',
  '#5C5C5C',
  '#8E8E8E',
  '#C4262E',
  '#E06C00',
  '#B8860B',
  '#2E7D32',
  '#0B6E99',
  '#3B4CCA',
  '#7B1FA2',
];

export const HIGHLIGHTS = [
  'transparent',
  '#FFF3A3',
  '#FFD9C7',
  '#FFC9D6',
  '#D8F0D2',
  '#CDE6F7',
  '#E0DBFB',
  '#EDEDED',
  '#FFE0B2',
  '#D7F5F0',
];

export const EMOJI = [
  '😀',
  '😄',
  '😊',
  '🙂',
  '😉',
  '😍',
  '🤩',
  '😎',
  '🤗',
  '🤝',
  '👍',
  '👏',
  '🙏',
  '💪',
  '✨',
  '🎉',
  '🎊',
  '🥂',
  '💐',
  '❤️',
  '🔥',
  '⭐',
  '✅',
  '📅',
  '📎',
  '📷',
  '💡',
  '💌',
  '💼',
  '🚀',
];

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Caret tracking, command running and the live bold/italic/underline state. */
export function useRichText() {
  const editor = useRef<HTMLDivElement>(null);
  /** Where the caret was before a popover stole focus. */
  const selection = useRef<Range | null>(null);
  const [marks, setMarks] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });

  /**
   * The caret is tracked continuously, not just on click: a selection made
   * with the keyboard has to survive a toolbar button stealing focus too.
   */
  useEffect(() => {
    function track() {
      const current = window.getSelection();
      if (current && current.rangeCount > 0 && editor.current?.contains(current.anchorNode)) {
        selection.current = current.getRangeAt(0).cloneRange();
      }
    }
    document.addEventListener('selectionchange', track);
    return () => document.removeEventListener('selectionchange', track);
  }, []);

  function remember() {
    const current = window.getSelection();
    if (current && current.rangeCount > 0 && editor.current?.contains(current.anchorNode)) {
      selection.current = current.getRangeAt(0).cloneRange();
    }
  }

  function restore() {
    const live = window.getSelection();
    // Still in the text: leave the selection exactly as the writer left it.
    if (live && live.rangeCount > 0 && editor.current?.contains(live.anchorNode)) {
      editor.current?.focus();
      return;
    }
    editor.current?.focus();
    const range = selection.current;
    if (!range) return;
    live?.removeAllRanges();
    live?.addRange(range);
  }

  function readMarks() {
    setMarks({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
    });
  }

  function exec(command: string, value?: string) {
    restore();
    document.execCommand(command, false, value);
    readMarks();
  }

  /** execCommand only knows sizes 1 to 7, so the tag it leaves is rewritten. */
  function setSize(px: string) {
    restore();
    document.execCommand('fontSize', false, '7');
    editor.current?.querySelectorAll('font[size="7"]').forEach((node) => {
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
  }

  function insert(html: string) {
    restore();
    document.execCommand('insertHTML', false, html);
  }

  /** Replaces everything written so far. Templates and replies both do this. */
  function setHtml(html: string) {
    const node = editor.current;
    if (node) node.innerHTML = html;
  }

  const getHtml = () => editor.current?.innerHTML ?? '';
  const getText = () => editor.current?.innerText ?? '';

  return {
    editor,
    marks,
    exec,
    setSize,
    insert,
    remember,
    restore,
    readMarks,
    setHtml,
    getHtml,
    getText,
  };
}

/** Closes whatever menu is open as soon as a click lands outside one. */
export function useMenu() {
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!menu) return;
    function away(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest('[data-menu]')) setMenu(null);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [menu]);

  return {
    menu,
    toggle: (name: string) => setMenu((current) => (current === name ? null : name)),
    close: () => setMenu(null),
  };
}

export function Tool({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
        active ? 'bg-black/[0.08]' : 'hover:bg-black/[0.05]'
      }`}
    >
      {children}
    </button>
  );
}

export function Rule() {
  return <span aria-hidden className="bg-line mx-1.5 h-5 w-px" />;
}

export function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left hover:bg-black/[0.05]"
    >
      {children}
    </button>
  );
}

/** A labelled dropdown. `up` opens it above, clear of the page fold. */
export function Picker({
  label,
  icon,
  width,
  open,
  up,
  onOpen,
  children,
}: {
  label?: string;
  icon?: ReactNode;
  width: number;
  open: boolean;
  up?: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <span className="relative" data-menu>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onOpen}
        className="flex h-8 items-center gap-1.5 rounded px-2 hover:bg-black/[0.05]"
      >
        {icon ?? label}
        <Caret className="h-3 w-3" />
      </button>
      {open && (
        <div
          style={{ minWidth: width }}
          className={`border-line bg-surface absolute left-0 z-30 max-h-[260px] overflow-y-auto rounded-md border py-1 shadow-lg ${
            up ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {children}
        </div>
      )}
    </span>
  );
}

export function Popover({
  label,
  open,
  up,
  onOpen,
  trigger,
  children,
}: {
  label: string;
  open: boolean;
  up?: boolean;
  onOpen: () => void;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="relative" data-menu>
      <Tool label={label} active={open} onClick={onOpen}>
        {trigger}
      </Tool>
      {open && (
        <div
          className={`border-line bg-surface absolute left-0 z-30 rounded-md border shadow-lg ${
            up ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {children}
        </div>
      )}
    </span>
  );
}

export function Swatches({
  label,
  colours,
  open,
  up,
  onOpen,
  onPick,
  children,
}: {
  label: string;
  colours: string[];
  open: boolean;
  up?: boolean;
  onOpen: () => void;
  onPick: (colour: string) => void;
  children: ReactNode;
}) {
  return (
    <span className="relative flex" data-menu>
      <Tool label={label} onClick={onOpen}>
        {children}
      </Tool>
      <button
        type="button"
        aria-label={`${label} choices`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onOpen}
        className="-ml-1 flex h-8 w-4 items-center justify-center rounded hover:bg-black/[0.05]"
      >
        <Caret className="h-3 w-3" />
      </button>
      {open && (
        <div
          className={`border-line bg-surface absolute left-0 z-30 grid w-[168px] grid-cols-5 gap-1.5 rounded-md border p-2 shadow-lg ${
            up ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {colours.map((colour) => (
            <button
              key={colour}
              type="button"
              title={colour}
              aria-label={colour}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(colour)}
              style={{ background: colour === 'transparent' ? '#fff' : colour }}
              className="border-line h-6 w-6 rounded border"
            >
              {colour === 'transparent' && <span className="text-muted text-[10px]">none</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export function LinkButton({
  open,
  up,
  onOpen,
  onApply,
}: {
  open: boolean;
  up?: boolean;
  onOpen: () => void;
  onApply: (url: string, text: string) => void;
}) {
  const [url, setUrl] = useState('https://');
  const [text, setText] = useState('');
  return (
    <span className="relative" data-menu>
      <Tool label="Add a link" active={open} onClick={onOpen}>
        <LinkIcon className="h-4 w-4" />
      </Tool>
      {open && (
        <div
          className={`border-line bg-surface absolute left-0 z-30 w-[260px] space-y-2 rounded-md border p-3 shadow-lg ${
            up ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-label="Link address"
            className="input-soft"
          />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Words to show (optional)"
            aria-label="Link text"
            className="input-soft"
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onApply(url, text)}
            className="btn-primary w-full py-2"
          >
            Add link
          </button>
        </div>
      )}
    </span>
  );
}

/* ---- icons ----------------------------------------------------------- */

type IconProps = { className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function Cross({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function Caret({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ListIcon({ className, numbered }: IconProps & { numbered?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      {numbered ? (
        <path d="M4 5h1v4M4 13h2l-2 3h2" />
      ) : (
        <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="2.4" />
      )}
    </svg>
  );
}

export function ChecklistIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M11 6h9M11 12h9M11 18h9" />
      <path d="m3 6 1.5 1.5L7.5 4.5M3 16.5 4.5 18l3-3" />
    </svg>
  );
}

export function CodeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m9 9-2 3 2 3M15 9l2 3-2 3" />
    </svg>
  );
}

export function AlignIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4 6h16M4 12h10M4 18h16" />
    </svg>
  );
}

export function UndoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M9 10H5V6" />
      <path d="M5 10a8 8 0 1 1 2 8" />
    </svg>
  );
}

export function PenIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4 20h16" />
      <path d="M7 16 16.5 6.5a2.1 2.1 0 0 1 3 3L10 19l-4 1z" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

export function SignIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M3 18c3 0 3-12 6-12s3 12 6 12 3-6 6-6" />
    </svg>
  );
}

export function Clip({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M20 12.5 12.2 20a4.5 4.5 0 0 1-6.4-6.4l8-7.8a3 3 0 1 1 4.2 4.3l-8 7.8a1.5 1.5 0 0 1-2.1-2.1l7.4-7.3" />
    </svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m4 17 5-5 4 4 3-2 4 4" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="m4 20 16-16" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function DotsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.6" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13" />
    </svg>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}
