'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-fetch';
import { STAGE_GROUPS } from '@/lib/stages';
import type { StageGroup } from '@/generated/prisma/enums';
import { PROJECT_PROPERTIES } from '@/lib/board-prefs';
import { Tip } from '@/components/ui';

export type BoardCard = {
  id: string;
  name: string;
  stageId: string | null;
  serviceDate: string;
  endDate: string;
  leadSource: string;
  type: string;
  contact: string;
  location: string;
  description: string;
};

export type BoardColumn = { id: string; name: string; group: StageGroup };

/**
 * Cards move between columns by dragging. The same move is available from the
 * card menu, because drag-and-drop is unreachable by keyboard.
 */
export function Board({
  columns,
  cards,
  showGroups,
  hiddenProps,
}: {
  columns: BoardColumn[];
  cards: BoardCard[];
  showGroups: boolean;
  hiddenProps: string[];
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);

  // A click anywhere off the card menu puts it away.
  useEffect(() => {
    if (!menu) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('[data-card-menu]')) return;
      setMenu(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menu]);
  // Moves show immediately; the refresh behind them makes it real.
  const [moved, setMoved] = useState<Record<string, string>>({});

  const stageOf = (card: BoardCard) => moved[card.id] ?? card.stageId;

  async function move(id: string, stageId: string) {
    setMenu(null);
    setOver(null);
    setDragging(null);
    const card = cards.find((item) => item.id === id);
    if (!card || stageOf(card) === stageId) return;

    setMoved((current) => ({ ...current, [id]: stageId }));
    const { error } = await api(`/api/projects/${id}`, { method: 'PATCH', body: { stageId } });
    if (error) {
      setMoved((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    router.refresh();
  }

  // Group headers sit above the run of columns that belong to them.
  const groupSpans = STAGE_GROUPS.map((group) => ({
    ...group,
    columns: columns.filter((column) => column.group === group.group),
  })).filter((group) => group.columns.length > 0);

  return (
    <div ref={board} className="-mx-8 mt-6 overflow-x-auto px-8 pb-4">
      <div className="flex min-w-max gap-4">
        {groupSpans.map((group) => (
          <div key={group.group} className="flex flex-col gap-2">
            {showGroups && (
              <span
                className={`sticky left-0 z-10 w-fit rounded-md px-2 py-0.5 text-xs font-medium ${group.chip}`}
              >
                {group.label}
              </span>
            )}

            <div className="flex gap-4">
              {group.columns.map((column) => {
                const inStage = cards.filter((card) => stageOf(card) === column.id);
                const isOver = over === column.id;

                return (
                  <section key={column.id} className="w-[300px] shrink-0">
                    <h2 className="mb-3 flex items-center gap-2 text-[18px] leading-[26px] font-semibold">
                      <span aria-hidden className={`h-4 w-1 rounded-full ${group.tint}`} />
                      {column.name}
                      <span className="text-muted font-normal">{inStage.length}</span>
                    </h2>

                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        setOver(column.id);
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setOver(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const id = event.dataTransfer.getData('text/plain');
                        if (id) void move(id, column.id);
                      }}
                      className={`min-h-[280px] space-y-1.5 rounded-xl p-1.5 transition-colors ${
                        isOver
                          ? 'border-accent bg-accent-soft/60 border-2 border-dashed'
                          : 'border-2 border-transparent bg-black/[0.06]'
                      }`}
                    >
                      {inStage.map((card) => (
                        <article
                          key={card.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', card.id);
                            event.dataTransfer.effectAllowed = 'move';
                            setDragging(card.id);
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setOver(null);
                          }}
                          className={`border-line bg-surface relative cursor-grab rounded-lg border p-4 active:cursor-grabbing ${
                            dragging === card.id ? 'opacity-40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="min-w-0 truncate font-semibold">
                              <Link href={`/projects/${card.id}`} className="hover:underline">
                                {card.name}
                              </Link>
                            </h3>
                            <span className="flex shrink-0 items-center gap-0.5">
                              <Tip label="Detail view">
                                <Link
                                  href={`/projects/${card.id}`}
                                  aria-label={`Open ${card.name}`}
                                  className="text-muted hover:text-foreground -mt-1 block p-1"
                                >
                                  <svg
                                    aria-hidden
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M4 5h16v14H4zM8 9h8M8 13h5" />
                                  </svg>
                                </Link>
                              </Tip>
                              <button
                                type="button"
                                aria-label={`Move ${card.name}`}
                                aria-expanded={menu === card.id}
                                data-card-menu
                                onClick={() => setMenu(menu === card.id ? null : card.id)}
                                className="text-muted hover:text-foreground -mt-1 px-1 text-lg leading-none"
                              >
                                ⋮
                              </button>
                            </span>
                          </div>

                          <dl className="mt-4 space-y-3 text-sm empty:mt-0">
                            {PROJECT_PROPERTIES.filter(
                              (property) => !hiddenProps.includes(property.key),
                            ).map((property) => (
                              <Row
                                key={property.key}
                                label={property.label}
                                value={card[property.key]}
                              />
                            ))}
                          </dl>

                          {menu === card.id && (
                            <div
                              data-card-menu
                              className="border-line bg-surface absolute top-10 right-3 z-20 max-h-60 w-48 overflow-y-auto rounded-lg border shadow-xl"
                            >
                              <p className="text-muted px-3 pt-2 pb-1 text-xs">Move to</p>
                              {columns.map((target) => (
                                <button
                                  key={target.id}
                                  type="button"
                                  onClick={() => void move(card.id, target.id)}
                                  disabled={target.id === stageOf(card)}
                                  className="hover:bg-accent-soft/60 w-full px-3 py-2 text-left text-sm disabled:opacity-40"
                                >
                                  {target.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted shrink-0">{label}:</dt>
      <dd className="min-w-0 truncate">{value}</dd>
    </div>
  );
}
