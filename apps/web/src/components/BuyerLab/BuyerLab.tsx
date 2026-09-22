import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authorizedFetch, SignedOutError } from '../../auth/authorizedFetch';
import { BuyerLabApiError, createBuyerLabApi, Fetcher } from './api';
import { OutcomeView } from './OutcomeView';
import { PanelPayload, PanelStep } from './PanelStep';
import { RunStep } from './RunStep';
import { TargetStep } from './TargetStep';
import type { Outcome, Progress, Project, ProjectDetail, Run, Surface } from './types';

interface Props {
  signedIn: boolean;
  isGlass: boolean;
  onOpenKeys: () => void;
  fetcher?: Fetcher;
}
interface Notice {
  ok: boolean;
  text: string;
  keyRequired?: boolean;
}

const POLL_MS = 3000;
const finished = (r: Run) => r.status === 'done' || r.status === 'budget_exhausted';

export const BuyerLab: React.FC<Props> = ({ signedIn, isGlass, onOpenKeys, fetcher = authorizedFetch }) => {
  const api = useMemo(() => createBuyerLabApi(fetcher), [fetcher]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const explain = (err: unknown): Notice => {
    if (err instanceof SignedOutError) return { ok: false, text: 'Sign in to use Buyer Lab.' };
    if (err instanceof BuyerLabApiError) return { ok: false, text: err.message, keyRequired: err.code === 'KEY_REQUIRED' };
    return { ok: false, text: 'Something went wrong. Try again.' };
  };
  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setNotice(explain(err));
    } finally {
      setBusy(false);
    }
  };

  const loadDetail = useCallback(async (id: string) => {
    const d = await api.getProject(id);
    setSelected(id);
    setDetail(d);
    setRun(d.latestRun);
    setProgress(null);
    setOutcome(null);
    if (d.latestRun && finished(d.latestRun)) setOutcome((await api.getOutcome(d.latestRun.id)).outcome);
  }, [api]);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const { projects: list } = await api.listProjects();
        if (cancelled) return;
        setProjects(list);
        if (list.length > 0) await loadDetail(list[0].id);
      } catch (err) {
        if (!cancelled) setNotice(explain(err));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, api, loadDetail]);

  // The poll drives the run: each request advances it, so this is the whole "job runner".
  useEffect(() => {
    if (!run || (run.status !== 'queued' && run.status !== 'running')) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const r = await api.pollRun(run.id);
        if (cancelled) return;
        setRun(r.run);
        setProgress(r.progress);
        if (finished(r.run)) setOutcome((await api.getOutcome(r.run.id)).outcome);
        else if (r.run.status === 'queued' || r.run.status === 'running') timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (!cancelled) setNotice(explain(err));
      }
    };
    void tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id, run?.status, api]);

  if (!signedIn) {
    return <div className="p-6 text-sm">Sign in to use Buyer Lab.</div>;
  }

  const reload = () => (selected ? loadDetail(selected) : Promise.resolve());
  return (
    <div className={`mx-auto max-w-3xl space-y-6 p-4 ${isGlass ? 'text-slate-900' : 'text-slate-100'}`}>
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Buyer Lab</h1>
        <p className="text-xs opacity-80">Test your project against a panel of simulated buyers before you spend on it. Simulated buyers, not measured customers: use what they say to decide what to test with real ones.</p>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <select aria-label="Project" className="rounded border border-slate-500/40 bg-transparent px-2 py-1 text-sm" value={selected ?? ''} onChange={(e) => guard(() => loadDetail(e.target.value))}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {detail && <button className="text-xs underline" onClick={() => { setSelected(null); setDetail(null); setRun(null); setOutcome(null); }}>New project</button>}
        </div>
      </header>

      {notice && (
        <div role="alert" className={`rounded border px-3 py-2 text-sm ${notice.ok ? 'border-emerald-500/40' : 'border-red-500/40'}`}>
          <span>{notice.text}</span>
          {notice.keyRequired && <button className="ml-2 underline" onClick={onOpenKeys}>Open Keys</button>}
        </div>
      )}

      <TargetStep
        detail={detail}
        busy={busy}
        onCreate={(name, url) => guard(async () => {
          const { project } = await api.createProject({ name, ...(url ? { targetUrl: url } : {}) });
          setProjects((p) => [project, ...p]);
          await loadDetail(project.id);
        })}
        onIngestUrl={(url) => guard(async () => { await api.ingestUrl(selected as string, url); await reload(); })}
        onIngestText={(i: { text: string; label: string; surface: Surface }) => guard(async () => { await api.ingestText(selected as string, i); await reload(); })}
      />

      {detail && (
        <>
          <PanelStep
            personas={detail.personas}
            hasSources={detail.sources.length > 0}
            busy={busy}
            onGenerate={(force) => guard(async () => { await api.inferPanel(selected as string, force); await reload(); })}
            onSave={(payload: PanelPayload) => guard(async () => { await api.savePanel(selected as string, payload); await reload(); })}
          />
          <RunStep
            estimate={detail.estimate}
            canRun={detail.sources.length > 0 && detail.personas.length > 0}
            run={run}
            progress={progress}
            busy={busy}
            onStart={() => guard(async () => { setOutcome(null); setProgress(null); setRun((await api.startRun(selected as string)).run); })}
          />
          {outcome && <OutcomeView outcome={outcome} />}
        </>
      )}
    </div>
  );
};
