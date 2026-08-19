'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignIcon,
  ChecklistIcon,
  Cross,
  DotsIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  HIGHLIGHTS,
  ImageIcon,
  LinkButton,
  ListIcon,
  MenuItem,
  PenIcon,
  Picker,
  Rule,
  SIZES,
  Swatches,
  TEXT_COLOURS,
  Tool,
  TrashIcon,
  escapeHtml,
  useMenu,
  useRichText,
} from './editor-kit';
import type { ProjectNote } from './notes-tab';

const PROMPT =
  'Write up a meeting, gather your thoughts, or keep a running list. ' +
  'Share it with the client when it is ready.';

/**
 * A note opened for writing. Everything typed saves on its own a moment after
 * the typing stops, so there is no save button to forget.
 */
export function NoteEditor({
  projectId,
  note,
  onSaved,
  onDuplicate,
  onDelete,
  onClose,
}: {
  projectId: string;
  note: ProjectNote;
  onSaved: (note: ProjectNote) => void;
  onDuplicate: (note: ProjectNote) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const {
    editor,
    marks,
    exec,
    setSize,
    insert,
    remember,
    readMarks,
    restore,
    setHtml,
    getHtml,
    getText,
  } = useRichText();
  const { menu, toggle, close } = useMenu();
  const files = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(note.title ?? '');
  const [shared, setShared] = useState(note.sharedWithClient);
  const [state, setState] = useState<'saved' | 'saving'>('saved');
  const [empty, setEmpty] = useState(!note.bodyHtml && !note.body);

  // The written body is set once, by hand: React must not own this subtree.
  useEffect(() => {
    setHtml(note.bodyHtml ?? escapeHtml(note.body).replace(/\n/g, '<br>'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !menu) onClose();
    }
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [menu, onClose]);

  async function save(patch: Record<string, unknown>) {
    setState('saving');
    const response = await fetch(`/api/project-notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const payload = (await response.json().catch(() => null)) as { note?: ProjectNote } | null;
    setState('saved');
    if (payload?.note) onSaved(payload.note);
  }

  /**
   * A ticked box only lives in the DOM property, so it is written back into
   * the markup before the note is stored.
   */
  function html(): string {
    editor.current?.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      if ((box as HTMLInputElement).checked) box.setAttribute('checked', '');
      else box.removeAttribute('checked');
    });
    return getHtml();
  }

  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave() {
    setEmpty(getText().trim() === '');
    if (typing.current) clearTimeout(typing.current);
    typing.current = setTimeout(() => {
      void save({ body: getText(), bodyHtml: html() });
    }, 700);
  }

  async function addImage(list: FileList | null) {
    if (!list?.length) return;
    const body = new FormData();
    for (const file of Array.from(list)) body.append('files', file);
    const response = await fetch(`/api/projects/${projectId}/files`, { method: 'POST', body });
    const payload = (await response.json().catch(() => null)) as {
      files?: { id: string; name: string }[];
    } | null;
    for (const file of payload?.files ?? []) {
      insert(
        `<img src="/api/project-files/${file.id}/content" alt="${escapeHtml(file.name)}" style="max-width:100%">`,
      );
    }
    scheduleSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/45 p-4">
      <div className="bg-surface flex h-full w-full max-w-4xl flex-col rounded-xl shadow-2xl">
        {/* ---- header --------------------------------------------------- */}
        <div className="border-line flex items-start gap-3 border-b px-6 py-4">
          <span className="bg-accent-soft text-accent mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {(title || 'Untitled note').slice(0, 1).toUpperCase()}
          </span>

          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => title !== (note.title ?? '') && void save({ title })}
              placeholder="Untitled note"
              aria-label="Note title"
              className="placeholder:text-muted w-full bg-transparent text-xl font-semibold outline-none"
            />
            <p className="text-muted mt-1 text-xs">
              {shared ? 'Shared with the client' : 'Only visible to you'}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-muted mr-1 text-sm italic">
              {state === 'saving' ? 'Saving…' : 'Saved'}
            </span>
            <span aria-hidden className="bg-line h-5 w-px" />

            <span className="relative" data-menu>
              <Tool label="More" active={menu === 'more'} onClick={() => toggle('more')}>
                <DotsIcon className="h-4 w-4" />
              </Tool>
              {menu === 'more' && (
                <div className="border-line bg-surface absolute top-full right-0 z-30 mt-1 w-[170px] rounded-md border py-1 text-sm shadow-lg">
                  <MenuItem
                    onClick={() => {
                      close();
                      onDuplicate({ ...note, title, body: getText(), bodyHtml: html() });
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <CopyIcon className="h-4 w-4" />
                      Duplicate
                    </span>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      close();
                      onDelete();
                    }}
                  >
                    <span className="text-accent flex items-center gap-2.5">
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </span>
                  </MenuItem>
                </div>
              )}
            </span>

            <Tool
              label={shared ? 'Stop sharing with the client' : 'Share with the client'}
              active={shared}
              onClick={() => {
                setShared(!shared);
                void save({ sharedWithClient: !shared });
              }}
            >
              {shared ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
            </Tool>

            <Tool label="Close" onClick={onClose}>
              <Cross className="h-5 w-5" />
            </Tool>
          </div>
        </div>

        {/* ---- toolbar -------------------------------------------------- */}
        <div className="border-line flex flex-wrap items-center gap-1 border-b px-4 py-2">
          <Picker
            label="14"
            width={62}
            open={menu === 'size'}
            onOpen={() => {
              remember();
              toggle('size');
            }}
          >
            {SIZES.map((size) => (
              <MenuItem
                key={size}
                onClick={() => {
                  setSize(size);
                  close();
                  scheduleSave();
                }}
              >
                {size}
              </MenuItem>
            ))}
          </Picker>

          <Rule />

          <Tool
            label="Bold"
            active={marks.bold}
            onClick={() => {
              exec('bold');
              scheduleSave();
            }}
          >
            <span className="font-serif text-[15px] font-bold">B</span>
          </Tool>
          <Tool
            label="Italic"
            active={marks.italic}
            onClick={() => {
              exec('italic');
              scheduleSave();
            }}
          >
            <span className="font-serif text-[15px] italic">I</span>
          </Tool>
          <Tool
            label="Underline"
            active={marks.underline}
            onClick={() => {
              exec('underline');
              scheduleSave();
            }}
          >
            <span className="font-serif text-[15px] underline">U</span>
          </Tool>
          <Tool
            label="Strikethrough"
            active={marks.strike}
            onClick={() => {
              exec('strikeThrough');
              scheduleSave();
            }}
          >
            <span className="font-serif text-[15px] line-through">S</span>
          </Tool>

          <Swatches
            label="Text colour"
            colours={TEXT_COLOURS}
            open={menu === 'colour'}
            onOpen={() => {
              remember();
              toggle('colour');
            }}
            onPick={(colour) => {
              exec('foreColor', colour);
              close();
              scheduleSave();
            }}
          >
            <span className="text-[15px] font-semibold underline decoration-[3px] decoration-[#C4262E] underline-offset-[3px]">
              A
            </span>
          </Swatches>

          <Swatches
            label="Highlight"
            colours={HIGHLIGHTS}
            open={menu === 'highlight'}
            onOpen={() => {
              remember();
              toggle('highlight');
            }}
            onPick={(colour) => {
              exec('hiliteColor', colour);
              close();
              scheduleSave();
            }}
          >
            <PenIcon className="h-4 w-4" />
          </Swatches>

          <Rule />

          <Picker
            icon={<AlignIcon className="h-4 w-4" />}
            width={44}
            open={menu === 'align'}
            onOpen={() => {
              remember();
              toggle('align');
            }}
          >
            {[
              ['justifyLeft', 'Left'],
              ['justifyCenter', 'Centre'],
              ['justifyRight', 'Right'],
              ['justifyFull', 'Justified'],
            ].map(([command, label]) => (
              <MenuItem
                key={command}
                onClick={() => {
                  exec(command);
                  close();
                  scheduleSave();
                }}
              >
                {label}
              </MenuItem>
            ))}
          </Picker>

          <Tool
            label="Bulleted list"
            onClick={() => {
              exec('insertUnorderedList');
              scheduleSave();
            }}
          >
            <ListIcon className="h-4 w-4" />
          </Tool>
          <Tool
            label="Numbered list"
            onClick={() => {
              exec('insertOrderedList');
              scheduleSave();
            }}
          >
            <ListIcon className="h-4 w-4" numbered />
          </Tool>
          <Tool
            label="To-do"
            onClick={() => {
              insert('<div><input type="checkbox">&nbsp;</div>');
              scheduleSave();
            }}
          >
            <ChecklistIcon className="h-4 w-4" />
          </Tool>

          <LinkButton
            open={menu === 'link'}
            onOpen={() => {
              remember();
              toggle('link');
            }}
            onApply={(url, text) => {
              restore();
              const collapsed = window.getSelection()?.isCollapsed ?? true;
              if (collapsed) {
                insert(`<a href="${escapeHtml(url)}">${escapeHtml(text || url)}</a>`);
              } else {
                document.execCommand('createLink', false, url);
              }
              close();
              scheduleSave();
            }}
          />

          <Tool
            label="Clear formatting"
            onClick={() => {
              exec('removeFormat');
              scheduleSave();
            }}
          >
            <span className="text-[15px] italic">
              T<sub className="text-[10px]">x</sub>
            </span>
          </Tool>

          <Tool label="Add an image" onClick={() => files.current?.click()}>
            <ImageIcon className="h-4 w-4" />
          </Tool>
          <input
            ref={files}
            type="file"
            accept="image/*"
            multiple
            hidden
            aria-label="Add an image"
            onChange={(event) => void addImage(event.target.files)}
          />
        </div>

        {/* ---- the note itself ------------------------------------------ */}
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <div
            ref={editor}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Note"
            onInput={scheduleSave}
            onKeyUp={readMarks}
            onMouseUp={() => {
              remember();
              readMarks();
            }}
            onBlur={() => {
              remember();
              void save({ body: getText(), bodyHtml: html() });
            }}
            className="composer-body min-h-full px-8 py-6 outline-none"
          />
          {empty && (
            <p className="text-muted pointer-events-none absolute top-6 left-8">{PROMPT}</p>
          )}
        </div>
      </div>
    </div>
  );
}
