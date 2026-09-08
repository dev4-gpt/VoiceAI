import { InstaticService } from '../services/instaticService';

describe('InstaticService — Visual CMS & AI Web Builder', () => {
  let service: InstaticService;

  beforeEach(() => {
    service = new InstaticService();
  });

  it('initializes with a default seeded page for DesignAcademy Studio', () => {
    const pages = service.getPages('DesignAcademy Studio');
    expect(pages.length).toBeGreaterThanOrEqual(1);
    expect(pages[0].companyName).toBe('DesignAcademy Studio');
    expect(pages[0].sections.length).toBe(3);
  });

  it('generates a complete typed Instatic page document from a content summary', () => {
    const page = service.generatePageFromContentPack(
      'Acme SaaS',
      'Autonomous Sales Sprints',
      {
        thesis: 'Close high-intent buyers around the clock.',
        hook: 'Stop losing 60% of after-hours traffic.',
        coreProblem: 'Static forms are slow and unengaging.',
        tacticalFramework: ['24/7 Spoken Anna SDR', 'CRM Sync', 'Instant Calendar Booking']
      }
    );

    expect(page.id).toMatch(/^page_instatic_/);
    expect(page.companyName).toBe('Acme SaaS');
    expect(page.sections).toHaveLength(3);

    const hero = page.sections.find((s) => s.name === 'Hero Section');
    expect(hero).toBeDefined();

    const voiceWidget = page.sections.find((s) => s.name.includes('Interactive Spoken Anna Widget'));
    expect(voiceWidget).toBeDefined();
  });

  it('surgically patches a specific node without altering siblings', () => {
    const page = service.generatePageFromContentPack('TestCo', 'Page Title', {
      thesis: 'Test thesis'
    });

    const heroSec = page.sections[0];
    const headlineNode = heroSec.children?.find((c) => c.semanticTag === 'h1')!;
    expect(headlineNode).toBeDefined();

    const updated = service.patchNode(page.id, headlineNode.id, { text: 'New High-Converting Headline' });
    expect(updated).not.toBeNull();

    const refetched = service.getPage(page.id)!;
    const refetchedHeadline = refetched.sections[0].children?.find((c) => c.id === headlineNode.id);
    expect(refetchedHeadline?.props.text).toBe('New High-Converting Headline');
  });

  it('compiles page document into clean, semantic static HTML with zero runtime bloat', () => {
    const page = service.generatePageFromContentPack('Veloce', 'Veloce Scale Sprints', {
      thesis: 'Veloce thesis',
      hook: 'Veloce hook'
    });

    const html = service.compileToStaticHtml(page);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Veloce Scale Sprints | Veloce</title>');
    expect(html).toContain('Veloce hook');
    // Ensure zero React/Vue runtime script tags
    expect(html).not.toContain('react.production.min.js');
    expect(html).not.toContain('vue.global.js');
    // Ensure embeddable Anna voice widget is included
    expect(html).toContain('embed.js');
  });

  it('performs AI node assistance with Anna GrowthOS guidelines', async () => {
    const page = service.generatePageFromContentPack('Studio', 'Title', { thesis: 'Thesis' });
    const heroSec = page.sections[0];
    const badgeNode = heroSec.children?.find((c) => c.id.includes('hero_badge'))!;

    const result = await service.aiAssistNode(page.id, badgeNode.id, 'Make it sound like an elite consultancy');
    expect(result.updatedPage).not.toBeNull();
    expect(result.explanation).toBeDefined();
  });
});
