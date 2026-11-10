import React, { useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  MapPin, 
  Cpu, 
  Wrench, 
  ShieldCheck, 
  Link2,
  Info
} from 'lucide-react';

interface Node {
  id: string;
  label: string;
  sublabel?: string;
  type: string;
  status?: string;
  risk_score?: number;
  thumbnail_url?: string;
  is_root?: boolean;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  label: string;
}

interface Props {
  graphData: {
    nodes: Node[];
    edges: Edge[];
  };
}

export const EvidenceGraphViewer: React.FC<Props> = ({ graphData }) => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-lg border border-slate-800">
        No relational evidence nodes currently linked to this incident.
      </div>
    );
  }

  const { nodes, edges } = graphData;

  // Layout calculation for clean radial / layered visual layout
  const rootNode = nodes.find(n => n.is_root) || nodes[0];
  const otherNodes = nodes.filter(n => n.id !== rootNode.id);

  // Center coordinates
  const width = 760;
  const height = 440;
  const cx = width / 2;
  const cy = height / 2;

  // Position other nodes in concentric or layered circle around center
  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodePositions[rootNode.id] = { x: cx, y: cy };

  const radius = Math.min(width, height) * 0.38;
  otherNodes.forEach((node, i) => {
    const angle = (i / otherNodes.length) * 2 * Math.PI - Math.PI / 2;
    // Jitter radius slightly based on type for visual depth
    const r = node.type === 'linked_incident' ? radius * 1.15 : (node.type === 'asset' ? radius * 0.85 : radius);
    nodePositions[node.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  });

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'incident': return { bg: '#0d9488', border: '#14b8a6', text: '#ffffff' };
      case 'observation': return { bg: '#1e293b', border: '#3b82f6', text: '#93c5fd' };
      case 'asset': return { bg: '#1e293b', border: '#06b6d4', text: '#67e8f9' };
      case 'location': return { bg: '#1e293b', border: '#10b981', text: '#6ee7b7' };
      case 'assessment': return { bg: '#1e293b', border: '#a855f7', text: '#d8b4fe' };
      case 'work_order': return { bg: '#1e293b', border: '#f59e0b', text: '#fcd34d' };
      case 'review': return { bg: '#1e293b', border: '#10b981', text: '#a7f3d0' };
      case 'linked_incident': return { bg: '#292524', border: '#f43f5e', text: '#fda4af' };
      default: return { bg: '#1e293b', border: '#64748b', text: '#cbd5e1' };
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'incident': return <Info className="w-4 h-4 text-white" />;
      case 'observation': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'asset': return <ImageIcon className="w-4 h-4 text-cyan-400" />;
      case 'location': return <MapPin className="w-4 h-4 text-emerald-400" />;
      case 'assessment': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'work_order': return <Wrench className="w-4 h-4 text-amber-400" />;
      case 'review': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'linked_incident': return <Link2 className="w-4 h-4 text-rose-400" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 overflow-hidden relative">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-brand-400" />
          <h4 className="text-sm font-semibold text-slate-200">Relational Evidence Graph</h4>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>
        <div className="text-xs text-slate-400">Click any node to inspect relationship</div>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[380px] select-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
            </marker>
          </defs>

          {/* Render Edges */}
          {edges.map(edge => {
            const sPos = nodePositions[edge.source];
            const tPos = nodePositions[edge.target];
            if (!sPos || !tPos) return null;

            const midX = (sPos.x + tPos.x) / 2;
            const midY = (sPos.y + tPos.y) / 2;

            return (
              <g key={edge.id} className="transition-all">
                <line
                  x1={sPos.x}
                  y1={sPos.y}
                  x2={tPos.x}
                  y2={tPos.y}
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray={edge.relation_type === 'possible_duplicate_of' ? '4 4' : 'none'}
                  markerEnd="url(#arrow)"
                />
                <rect
                  x={midX - 32}
                  y={midY - 8}
                  width="64"
                  height="16"
                  rx="3"
                  fill="#0f172a"
                  className="opacity-90"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map(node => {
            const pos = nodePositions[node.id] || { x: cx, y: cy };
            const style = getNodeColor(node.type);
            const isSelected = selectedNode?.id === node.id;
            const r = node.is_root ? 28 : 20;

            return (
              <g
                key={node.id}
                className="cursor-pointer group"
                onClick={() => setSelectedNode(node)}
                transform={`translate(${pos.x}, ${pos.y})`}
              >
                {/* Highlight ring if selected */}
                {isSelected && (
                  <circle
                    r={r + 6}
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-spin-slow"
                  />
                )}
                
                <circle
                  r={r}
                  fill={style.bg}
                  stroke={style.border}
                  strokeWidth={node.is_root ? "3" : "2"}
                  className="transition-transform group-hover:scale-110 drop-shadow"
                />

                <text
                  y={node.is_root ? 4 : 3}
                  textAnchor="middle"
                  fill={style.text}
                  fontSize={node.is_root ? "11" : "9"}
                  fontWeight={node.is_root ? "bold" : "600"}
                  fontFamily="sans-serif"
                >
                  {node.label.length > 12 ? node.label.substring(0, 11) + '..' : node.label}
                </text>

                <text
                  y={r + 14}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {node.sublabel || node.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="mt-3 p-3 bg-slate-950/80 rounded-lg border border-slate-700 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              {getNodeIcon(selectedNode.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">{selectedNode.label}</span>
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {selectedNode.type}
                </span>
                {selectedNode.status && (
                  <span className="text-xs text-brand-300 font-medium">[{selectedNode.status}]</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedNode.sublabel || `Node ID: ${selectedNode.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

