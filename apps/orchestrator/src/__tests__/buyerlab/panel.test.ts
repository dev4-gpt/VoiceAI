import { inferPanel, sanitizePersona, sanitizePersonas, missingArchetypes, PanelIncompleteError } from '../../buyerlab/panel';
import { LlmOutputError } from '../../buyerlab/llm';
import { mkSource, reply } from './helpers';
import type { Archetype } from '../../buyerlab/types';

const person = (archetype: string, extra: Record<string, unknown> = {}) => ({
  name: `${archetype} person`, archetype, role: 'Role', goals: ['g'], constraints: ['c'], budgetAuthority: 'influencer',
  priorTools: ['t'], reasonNotToBuy: 'Because.', surfaces: ['public'], ...extra
});
const FIVE = ['skeptic', 'budget_holder', 'champion', 'technical_evaluator', 'distracted_visitor'];
const panel = (archetypes: string[]) => ({ icp: 'Ops leaders at small agencies.', personas: archetypes.map((a) => person(a)) });
const sources = [mkSource(), mkSource({ id: 's2', surface: 'signed_in', contentHash: 'h2', label: 'App' })];
const project = { name: 'Veloce', targetUrl: 'https://veloceos.cloud' };

describe('inferPanel', () => {
  it('returns the five required archetypes first, then extras, trimmed to the size', async () => {
    const llm = jest.fn().mockResolvedValue(reply(panel(['other', ...FIVE, 'other', 'other'])));
    const r = await inferPanel({ project, sources, size: 6, llm });
    expect(r.personas.map((p) => p.archetype)).toEqual([...FIVE, 'other']);
    expect(r.icp).toBe('Ops leaders at small agencies.');
    expect(r.callsUsed).toBe(1);
    expect(r.tokens).toEqual({ prompt: 100, completion: 50 });
  });

  it('retries once, naming the missing archetypes, and succeeds', async () => {
    const llm = jest.fn().mockResolvedValueOnce(reply(panel(['skeptic', 'champion']))).mockResolvedValueOnce(reply(panel(FIVE)));
    const r = await inferPanel({ project, sources, size: 5, llm });
    expect(llm).toHaveBeenCalledTimes(2);
    const second = llm.mock.calls[1][0].user as string;
    expect(second).toMatch(/missing/i);
    expect(second).toContain('budget_holder');
    expect(r.callsUsed).toBe(2);
    expect(r.tokens).toEqual({ prompt: 200, completion: 100 });
  });

  it('gives up with PanelIncompleteError after the retry, having made exactly two calls', async () => {
    const llm = jest.fn().mockResolvedValue(reply(panel(['skeptic'])));
    await expect(inferPanel({ project, sources, size: 5, llm })).rejects.toMatchObject({ name: 'PanelIncompleteError', missing: ['budget_holder', 'champion', 'technical_evaluator', 'distracted_visitor'] });
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('retries once on an unparseable answer', async () => {
    const llm = jest.fn().mockResolvedValueOnce(reply('not json')).mockResolvedValueOnce(reply(panel(FIVE)));
    expect((await inferPanel({ project, sources, size: 5, llm })).personas).toHaveLength(5);
  });

  it('rethrows an output error when both attempts are unparseable', async () => {
    const llm = jest.fn().mockResolvedValue(reply('nope'));
    await expect(inferPanel({ project, sources, size: 5, llm })).rejects.toBeInstanceOf(LlmOutputError);
  });

  it('forces a distracted visitor onto the public surface and limits others to what exists', async () => {
    const raw = { icp: 'x', personas: FIVE.map((a) => person(a, { surfaces: ['public', 'signed_in', 'nonsense'] })) };
    const r = await inferPanel({ project, sources, size: 5, llm: jest.fn().mockResolvedValue(reply(raw)) });
    expect(r.personas.find((p) => p.archetype === 'distracted_visitor')!.surfaces).toEqual(['public']);
    expect(r.personas.find((p) => p.archetype === 'champion')!.surfaces).toEqual(['public', 'signed_in']);
  });

  it('never offers a surface that has no source', async () => {
    const raw = { icp: 'x', personas: FIVE.map((a) => person(a, { surfaces: ['public', 'signed_in'] })) };
    const r = await inferPanel({ project, sources: [mkSource()], size: 5, llm: jest.fn().mockResolvedValue(reply(raw)) });
    expect(r.personas.every((p) => p.surfaces.length === 1 && p.surfaces[0] === 'public')).toBe(true);
  });

  it('clamps the size to 5..12', async () => {
    const many = { icp: 'x', personas: [...FIVE, ...Array(10).fill('other')].map((a) => person(a)) };
    const r = await inferPanel({ project, sources, size: 99, llm: jest.fn().mockResolvedValue(reply(many)) });
    expect(r.personas).toHaveLength(12);
  });
});

describe('sanitizePersona', () => {
  it('drops a persona with no name', () => expect(sanitizePersona({ archetype: 'skeptic' }, ['public'])).toBeNull());
  it('maps an unknown archetype to "other" and defaults budget authority', () => {
    const p = sanitizePersona({ name: 'N', archetype: 'wizard' }, ['public'])!;
    expect(p.archetype).toBe('other');
    expect(p.spec.budgetAuthority).toBe('none');
    expect(p.edited).toBe(false);
  });
  it('clamps list sizes and string lengths', () => {
    const p = sanitizePersona({ name: 'N'.repeat(500), goals: Array(20).fill('g'.repeat(500)) }, ['public'])!;
    expect(p.spec.name.length).toBeLessThanOrEqual(80);
    expect(p.spec.goals).toHaveLength(5);
    expect(p.spec.goals[0].length).toBeLessThanOrEqual(200);
  });
  it('sanitizePersonas skips invalid entries and caps the count', () => {
    expect(sanitizePersonas([{ name: 'A' }, null, 'x', { name: 'B' }], ['public'], 1)).toHaveLength(1);
    expect(sanitizePersonas('nope', ['public'])).toEqual([]);
  });
});

describe('missingArchetypes', () => {
  it('lists required archetypes that are absent', () => {
    const have: Array<{ archetype: Archetype }> = [{ archetype: 'skeptic' }, { archetype: 'other' }];
    expect(missingArchetypes(have)).toEqual(['budget_holder', 'champion', 'technical_evaluator', 'distracted_visitor']);
  });
});
