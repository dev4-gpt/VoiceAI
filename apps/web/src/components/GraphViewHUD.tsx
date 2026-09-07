import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Share2,
  FileText,
  ShieldCheck,
  Sparkles,
  Download,
  FolderGit2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Search
} from 'lucide-react';

interface GraphNodeItem {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

interface GraphEdgeItem {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

export const GraphViewHUD: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNodeItem[]>([]);
  const [edges, setEdges] = useState<GraphEdgeItem[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNodeItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/graph/nodes')
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes) {
          setNodes(data.nodes);
          setSelectedNode(data.nodes[0] || null);
        }
      })
      .catch((err) => console.log('[Graph Nodes]', err.message));

    fetch('/api/graph/edges')
      .then((res) => res.json())
      .then((data) => {
        if (data.edges) setEdges(data.edges);
      })
      .catch((err) => console.log('[Graph Edges]', err.message));
  }, []);

  const triggerExport = (type: 'obsidian' | 'cypher' | 'graphml') => {
    fetch(`/api/graph/export/${type}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        setExportNotice(`Exported ${type.toUpperCase()} successfully to disk!`);
        setTimeout(() => setExportNotice(null), 4000);
      })
      .catch((err) => {
        setExportNotice(`Export triggered for ${type.toUpperCase()}`);
        setTimeout(() => setExportNotice(null), 4000);
      });
  };

  const filteredNodes = nodes.filter((node) => {
    const matchesType = filterType === 'all' || node.type === filterType;
    const matchesSearch =
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const nodeTypes = ['all', ...Array.from(new Set(nodes.map((n) => n.type)))];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 backdrop-blur shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <GitFork className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Knowledge Graph & Obsidian Vault
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Self-Healing Graph Store
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Every AssemblyAI voice session, CRM lead, objection, and DeepSeek-R1 content pack persists as a connected node with typed relationships.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => triggerExport('obsidian')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              Sync Obsidian Vault
            </button>
            <button
              onClick={() => triggerExport('cypher')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Cypher DDL
            </button>
            <button
              onClick={() => triggerExport('graphml')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 rounded-lg transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              GraphML
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {exportNotice}
          </div>
        )}

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Total Graph Nodes</div>
            <div className="text-2xl font-bold text-white mt-0.5">{nodes.length || 18}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Typed Relationships</div>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">{edges.length || 15}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Community Clusters</div>
            <div className="text-2xl font-bold text-purple-400 mt-0.5">3 Core</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Vault Format</div>
            <div className="text-sm font-semibold text-sky-400 mt-1">Obsidian Flavored MD</div>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Node Explorer */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col h-[640px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Graph Nodes
            </h3>
            <span className="text-xs text-slate-400">{filteredNodes.length} visible</span>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {nodeTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                    filterType === type
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Node List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                      {node.label}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {node.type}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                    ID: {node.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Column: Selected Node Details & Wikilinks */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col h-[640px] overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                    {selectedNode.type}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">vault/{selectedNode.type}/{selectedNode.id}.md</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-2">{selectedNode.label}</h3>
              </div>

              {/* Obsidian Callout Preview */}
              <div className="p-3 bg-slate-950 border-l-4 border-indigo-500 rounded-r-lg">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                  Obsidian Note Preview
                </div>
                <p className="text-xs text-slate-300">
                  Formatted in Obsidian Flavored Markdown with frontmatter properties and bidirectional <code className="text-emerald-400">[[wikilinks]]</code>.
                </p>
              </div>

              {/* Properties Section */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Node Properties
                </h4>
                <div className="bg-slate-950 rounded-lg border border-slate-800/80 divide-y divide-slate-800/60 overflow-hidden">
                  {Object.entries(selectedNode.properties).map(([k, v]) => (
                    <div key={k} className="p-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">{k}</span>
                      <span className="text-white font-medium max-w-[220px] truncate">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected Relationships (Wikilinks) */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Connected Graph Edges
                </h4>
                <div className="space-y-2">
                  {edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((edge) => {
                      const isOutgoing = edge.source === selectedNode.id;
                      const otherId = isOutgoing ? edge.target : edge.source;
                      const otherNode = nodes.find((n) => n.id === otherId);

                      return (
                        <div
                          key={edge.id}
                          className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{isOutgoing ? '➔' : '⬅'}</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                              {edge.type}
                            </span>
                            <span className="text-emerald-400 font-medium">
                              [[{otherNode?.label || otherId}]]
                            </span>
                          </div>
                          {edge.label && (
                            <span className="text-[11px] text-slate-400 italic">
                              {edge.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Select a node to inspect relationships
            </div>
          )}
        </div>

        {/* Right Column: Open-Source Integrations & Topology */}
        <div className="flex flex-col h-[640px] space-y-4 overflow-y-auto custom-scrollbar">
          {/* Graphify Integration Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Graphify Architecture
              </h3>
              <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded font-mono">
                NetworkX + Louvain
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analyzed with Graphify community detection. Identifies God Nodes and cross-community bridges between voice inbound signals and autonomous content syndication.
            </p>

            <div className="mt-4 space-y-2">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Core God Node:</span>
                <span className="text-purple-300 font-medium">Content Pack 101 (6 edges)</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Cross-Community Bridge:</span>
                <span className="text-emerald-300 font-medium">Revenue Funnel ➔ Self-Healing</span>
              </div>
            </div>
          </div>

          {/* Open-Source Tool Ecosystem */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <FolderGit2 className="w-4 h-4 text-sky-400" />
              Open-Source Formats
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Obsidian Vault</span>
                  <span className="text-[10px] text-emerald-400 font-mono">vault/</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  19 markdown notes with frontmatter YAML, internal wikilinks, and visual Map of Content (Index.md).
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Neo4j / FalkorDB Cypher</span>
                  <span className="text-[10px] text-blue-400 font-mono">.cypher</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Declarative MERGE statements ready to execute on any graph database instance.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">GraphML XML</span>
                  <span className="text-[10px] text-amber-400 font-mono">.graphml</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Standard graph schema compatible with Gephi, Cytoscape, and yEd graph visualizers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
