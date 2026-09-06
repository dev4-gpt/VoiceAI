import sys
import json
from pathlib import Path

from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html

out_dir = Path("graphify-out")
out_dir.mkdir(exist_ok=True)

extract_file = out_dir / ".graphify_extract.json"
if not extract_file.exists():
    print(f"Extraction file {extract_file} does not exist.")
    sys.exit(1)

extraction = json.loads(extract_file.read_text(encoding="utf-8"))

# Detection mock metadata for report
detection = {
    "total_files": 19,
    "total_words": 4200,
    "files": {
        "document": [n["source_file"] for n in extraction.get("nodes", [])]
    }
}

# Build graph
G = build_from_json(extraction, root=".", directed=True)
print(f"Built NetworkX Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

# Cluster communities
communities = cluster(G)
cohesion = score_all(G, communities)
gods = god_nodes(G)
surprises = surprising_connections(G, communities)

# Label communities cleanly
labels = {
    0: "Revenue & BANT Lead Funnel",
    1: "Objections & Policy Guardrails",
    2: "Hermes Multi-Channel Content Factory",
    3: "Autonomous Self-Healing Loop"
}

# Ensure all communities have labels
for cid in communities:
    if cid not in labels:
        labels[cid] = f"Community {cid}"

questions = suggest_questions(G, communities, labels)
tokens = {"input": 1420, "output": 890}

# Export JSON
to_json(G, communities, str(out_dir / "graph.json"))
print(f"Exported graph.json to {out_dir / 'graph.json'}")

# Generate GRAPH_REPORT.md
report = generate(
    G,
    communities,
    cohesion,
    labels,
    gods,
    surprises,
    detection,
    tokens,
    ".",
    suggested_questions=questions
)
(out_dir / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
print(f"Generated GRAPH_REPORT.md in {out_dir}")

# Generate HTML visualization
try:
    to_html(G, communities, str(out_dir / "graph.html"), community_labels=labels)
    print(f"Generated graph.html in {out_dir}")
except Exception as e:
    print(f"Warning on to_html: {e}")

print("Graphify pipeline complete!")
