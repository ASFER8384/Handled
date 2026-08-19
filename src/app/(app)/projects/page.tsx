import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/session';
import { formatMoney } from '@/lib/money';
import { EmptyState, formatDate } from '@/components/ui';
import { CreateProjectButton } from '@/components/create-new';
import { BoardToolbar } from './board-toolbar';
import { Board } from './board';
import { TableView } from './table-view';
import { ViewTabs } from './view-tabs';

export default async function ProjectsPage(props: PageProps<'/projects'>) {
  const ctx = await requireWorkspace();
  const params = await props.searchParams;
  const stageFilter = typeof params.stage === 'string' ? params.stage : null;
  const requestedView = typeof params.view === 'string' ? params.view : null;


  const [allProjects, clientCount, stages, savedViews] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ eventDate: 'asc' }, { updatedAt: 'desc' }],
    }),
    prisma.client.count({ where: { workspaceId: ctx.workspaceId } }),
    prisma.pipelineStage.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { position: 'asc' },
    }),
    prisma.projectView.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { position: 'asc' },
    }),
  ]);

  // Filtering below narrows this; the query itself stays cacheable.
  let projects = allProjects;

  // A workspace that predates views, or lost its last one, gets one back.
  const views =
    savedViews.length > 0
      ? savedViews
      : [
          await prisma.projectView.create({
            data: {
              workspaceId: ctx.workspaceId,
              name: 'Main view',
              position: 0,
              isDefault: true,
            },
          }),
        ];

  const active = views.find((item) => item.id === requestedView) ?? views[0];
  // Filters are stored as JSON, so they are read back defensively.
  const viewFilters = Array.isArray(active.filters)
    ? (active.filters as { field?: unknown; value?: unknown }[])
        .filter((entry) => typeof entry?.field === 'string' && typeof entry?.value === 'string')
        .map((entry) => ({ field: entry.field as string, value: entry.value as string }))
    : [];

  const viewPrefs = {
    id: active.id,
    layout: active.layout,
    showGroups: active.showGroups,
    hiddenProps: active.hiddenProps,
    sortField: active.sortField,
    sortDir: active.sortDir === 'desc' ? ('desc' as const) : ('asc' as const),
    filters: viewFilters,
  };

  // The view carries how it is sorted and filtered, so the tab you pick
  // decides what this page shows.
  const sort = active.sortField;
  const descending = active.sortDir === 'desc';

  // The values the toolbar can offer are the ones the projects actually hold.
  const unique = (values: (string | null)[]) =>
    [...new Set(values.filter((value): value is string => Boolean(value)))].sort();

  const filterFields = [
    { key: 'stage', label: 'Stage', values: stages.map((stage) => stage.name) },
    { key: 'type', label: 'Type', values: unique(projects.map((project) => project.type)) },
    {
      key: 'leadSource',
      label: 'Lead Source',
      values: unique(projects.map((project) => project.leadSource)),
    },
    {
      key: 'contact',
      label: 'Contacts',
      values: unique(projects.map((project) => project.client.name)),
    },
  ];

  // Every filter the view carries has to match.
  for (const { field, value } of viewFilters) {
    const stageId = stages.find((stage) => stage.name === value)?.id ?? null;
    projects = projects.filter((project) => {
      switch (field) {
        case 'stage':
          return project.stageId === stageId;
        case 'type':
          return project.type === value;
        case 'leadSource':
          return project.leadSource === value;
        case 'contact':
          return project.client.name === value;
        default:
          return true;
      }
    });
  }

  // Sorting is the toolbar's; ordering here keeps board and table in step.
  if (sort) {
    const rank = new Map(stages.map((stage, index) => [stage.id, index]));
    const key = (project: (typeof projects)[number]) => {
      switch (sort) {
        case 'name':
          return project.name.toLowerCase();
        case 'date':
          return project.eventDate ? project.eventDate.getTime() : Infinity;
        case 'type':
          return (project.type ?? '').toLowerCase();
        case 'leadSource':
          return (project.leadSource ?? '').toLowerCase();
        case 'value':
          return project.valueCents;
        default:
          return project.stageId ? (rank.get(project.stageId) ?? Infinity) : Infinity;
      }
    };
    projects.sort((a, b) => {
      const left = key(a);
      const right = key(b);
      const order =
        typeof left === 'string' && typeof right === 'string'
          ? left.localeCompare(right)
          : Number(left) - Number(right);
      return descending ? -order : order;
    });
  }

  // Hidden stages stay off the board; their projects are reachable elsewhere.
  const columns = stages
    .filter((stage) => !stage.hidden)
    .map((stage) => ({ id: stage.id, name: stage.name, group: stage.group }));

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Projects</h1>
        <CreateProjectButton />
      </header>

      <ViewTabs
        views={views.map((item) => ({
          id: item.id,
          name: item.name,
          isDefault: item.isDefault,
        }))}
        activeId={active.id}
      />

      <BoardToolbar
        view={viewPrefs}
        filters={filterFields}
        stages={stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          group: stage.group,
          hidden: stage.hidden,
        }))}
      />

      {clientCount === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Add a contact first"
            body="Projects belong to a contact, so start there and come back."
          />
        </div>
      ) : active.layout === 'LIST' ? (
        <TableView
          columns={columns}
          stageId={stageFilter}
          hiddenProps={active.hiddenProps}
          rows={projects.map((project) => ({
            id: project.id,
            name: project.name,
            stageId: project.stageId,
            contact: project.client.name,
            type: project.type ?? '—',
            date: formatDate(project.eventDate),
            location: project.location ?? '—',
            description: project.description ?? '',
          }))}
        />
      ) : (
        <Board
          columns={columns}
          showGroups={active.showGroups}
          hiddenProps={active.hiddenProps}
          cards={projects.map((project) => ({
            id: project.id,
            name: project.name,
            stageId: project.stageId,
            serviceDate: formatDate(project.eventDate),
            leadSource: project.leadSource ?? 'Unknown',
            type: project.type ?? 'Unknown',
            contact: project.client.name,
            value: formatMoney(project.valueCents, ctx.currency),
          }))}
        />
      )}
    </>
  );
}
