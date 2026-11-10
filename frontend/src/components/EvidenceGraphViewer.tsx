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
      <div className="p-8 text-center text-[#5A6B7C] bg-[#F6F8FA] rounded-lg border border-[#DDE4EC] text-xs">
        No relational evidence nodes currently linked to this incident.
      </div>
    );
  }

  const { nodes, edges } = graphData;
  const rootNode = nodes.find(n => n.is_root) || nodes[0];
  const otherNodes = nodes.filter(n => n.id !== rootNode.id);

  const width = 760;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodePositions[rootNode.id] = { x: cx, y: cy };

  const radius = Math.min(width, height) * 0.37;
  otherNodes.forEach((node, i) => {
    const angle = (i / Math.max(1, otherNodes.length)) * 2 * Math.PI - Math.PI / 2;
    const r = node.type === 'linked_incident' ? radius * 1.12 : (node.type === 'asset' ? radius * 0.85 : radius);
    nodePositions[node.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  });

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'incident': return { bg: '#172B3A', border: '#167C80', text: '#ffffff' };
      case 'observation': return { bg: '#EFF6FF', border: '#3979B7', text: '#1E40AF' };
      case 'asset': return { bg: '#F0FDFA', border: '#167C80', text: '#116265' };
      case 'location': return { bg: '#ECFDF5', border: '#39866A', text: '#065F46' };
      case 'assessment': return { bg: '#F8FAFC', border: '#3979B7', text: '#263746' };
      case 'work_order': return { bg: '#FFFBEB', border: '#D99A32', text: '#92400E' };
      case 'review': return { bg: '#ECFDF5', border: '#39866A', text: '#065F46' };
      case 'linked_incident': return { bg: '#FEF2F2', border: '#DC4C4C', text: '#991B1B' };
      default: return { bg: '#F8FAFC', border: '#94A3B8', text: '#263746' };
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'incident': return <Info className="w-4 h-4 text-[#167C80]" />;
      case 'observation': return <FileText className="w-4 h-4 text-[#3979B7]" />;
      case 'asset': return <ImageIcon className="w-4 h-4 text-[#167C80]" />;
      case 'location': return <MapPin className="w-4 h-4 text-[#39866A]" />;
      case 'assessment': return <Cpu className="w-4 h-4 text-[#3979B7]" />;
      case 'work_order': return <Wrench className="w-4 h-4 text-[#D99A32]" />;
      case 'review': return <ShieldCheck className="w-4 h-4 text-[#39866A]" />;
      case 'linked_incident': return <Link2 className="w-4 h-4 text-[#DC4C4C]" />;
      default: return <Info className="w-4 h-4 text-[#5A6B7C]" />;
    }
  };

  return (
    <div className="bg-[#F6F8FA] rounded-xl border border-[#DDE4EC] p-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between mb-3 border-b border-[#DDE4EC] pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#167C80]" />
          <h4 className="text-sm font-semibold text-[#263746]">Relational Evidence Graph</h4>
          <span className="text-xs bg-white border border-[#DDE4EC] text-[#5A6B7C] px-2 py-0.5 rounded-full">
            {nodes.length} nodes &middot; {edges.length} edges
          </span>
        </div>
        <div className="text-xs text-[#5A6B7C]">Select a node to inspect provenance</div>
      </div>

      <div className="relative overflow-x-auto bg-white rounded-lg border border-[#DDE4EC]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px] h-[340px] select-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
            </marker>
          </defs>

          {edges.map(edge => {
            const sPos = nodePositions[edge.source];
            const tPos = nodePositions[edge.target];
            if (!sPos || !tPos) return null;

            const midX = (sPos.x + tPos.x) / 2;
            const midY = (sPos.y + tPos.y) / 2;

            return (
              <g key={edge.id}>
                <line
                  x1={sPos.x}
                  y1={sPos.y}
                  x2={tPos.x}
                  y2={tPos.y}
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray={edge.relation_type === 'possible_duplicate_of' ? '4 4' : 'none'}
                  markerEnd="url(#arrow)"
                />
                <rect x={midX - 36} y={midY - 8} width="72" height="16" rx="3" fill="#F8FAFC" stroke="#E2E8F0" />
                <text x={midX} y={midY + 3} textAnchor="middle" fill="#5A6B7C" fontSize="9" fontFamily="sans-serif">
                  {edge.label}
                </text>
              </g>
            );
          })}

          {nodes.map(node => {
            const pos = nodePositions[node.id] || { x: cx, y: cy };
            const style = getNodeColor(node.type);
            const isSelected = selectedNode?.id === node.id;
            const r = node.is_root ? 28 : 21;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node)}
                transform={`translate(${pos.x}, ${pos.y})`}
              >
                {isSelected && (
                  <circle r={r + 5} fill="none" stroke="#167C80" strokeWidth="2" strokeDasharray="3 3" />
                )}
                <circle r={r} fill={style.bg} stroke={style.border} strokeWidth={node.is_root ? '3' : '2'} />
                <text
                  y={node.is_root ? 4 : 3}
                  textAnchor="middle"
                  fill={style.text}
                  fontSize={node.is_root ? '11' : '9'}
                  fontWeight={node.is_root ? 'bold' : '600'}
                  fontFamily="sans-serif"
                >
                  {node.label.length > 11 ? node.label.substring(0, 10) + '..' : node.label}
                </text>
                <text y={r + 14} textAnchor="middle" fill="#5A6B7C" fontSize="9" fontFamily="sans-serif">
                  {node.sublabel || node.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-[#DDE4EC] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F6F8FA] rounded-lg border border-[#DDE4EC]">
              {getNodeIcon(selectedNode.type)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#263746]">{selectedNode.label}</span>
                <span className="text-[11px] uppercase px-2 py-0.5 rounded bg-[#F6F8FA] text-[#5A6B7C] border border-[#DDE4EC]">
                  {selectedNode.type}
                </span>
                {selectedNode.status && (
                  <span className="text-xs text-[#167C80] font-medium">[{selectedNode.status}]</span>
                )}
              </div>
              <p className="text-xs text-[#5A6B7C] mt-0.5">
                {selectedNode.sublabel || `Node ID: ${selectedNode.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs text-[#5A6B7C] hover:text-[#263746] px-2.5 py-1 rounded bg-[#F6F8FA] border border-[#DDE4EC]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
