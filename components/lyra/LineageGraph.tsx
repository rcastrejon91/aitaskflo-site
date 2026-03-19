"use client";

import { motion } from "framer-motion";
import type { LineageGraph, LineageNode } from "@/lib/types/lyra";

interface Props {
  graph: LineageGraph;
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  selectedAgentId?: string;
}

const NODE_R = 26;

function EdgePath({ from, to, graph }: { from: string; to: string; graph: LineageGraph }) {
  const fromNode = graph.nodes.find((n) => n.agent.id === from);
  const toNode = graph.nodes.find((n) => n.agent.id === to);
  if (!fromNode || !toNode) return null;

  const x1 = fromNode.x;
  const y1 = fromNode.y + NODE_R;
  const x2 = toNode.x;
  const y2 = toNode.y - NODE_R;
  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  return (
    <motion.path
      d={d}
      fill="none"
      stroke="url(#edgeGradient)"
      strokeWidth={2}
      strokeOpacity={0.6}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    />
  );
}

function AgentNode({
  node,
  isActive,
  isSelected,
  onClick,
}: {
  node: LineageNode;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { agent, x, y } = node;
  const color = isActive ? "#a855f7" : isSelected ? "#ec4899" : "#6366f1";
  const label = agent.name.replace("Lyra ", "v");

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: node.depth * 0.15 }}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {/* Glow ring for active */}
      {isActive && (
        <motion.circle
          cx={x}
          cy={y}
          r={NODE_R + 8}
          fill="none"
          stroke="#a855f7"
          strokeWidth={2}
          animate={{ strokeOpacity: [0.3, 0.9, 0.3], r: [NODE_R + 6, NODE_R + 12, NODE_R + 6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Node background */}
      <circle
        cx={x}
        cy={y}
        r={NODE_R}
        fill={`${color}22`}
        stroke={color}
        strokeWidth={isSelected || isActive ? 2.5 : 1.5}
        filter="url(#glow)"
      />

      {/* Generation badge */}
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={12}
        fontWeight="bold"
        fontFamily="monospace"
      >
        {label}
      </text>

      {/* Score badge */}
      {agent.averageScore > 0 && (
        <text
          x={x}
          y={y + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={9}
          opacity={0.8}
        >
          ★{agent.averageScore.toFixed(1)}
        </text>
      )}

      {/* Agent name below */}
      <text
        x={x}
        y={y + NODE_R + 14}
        textAnchor="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize={10}
      >
        {agent.name}
      </text>

      {/* Reflection count */}
      <text
        x={x}
        y={y + NODE_R + 26}
        textAnchor="middle"
        fill="rgba(255,255,255,0.4)"
        fontSize={9}
      >
        {agent.reflectionCount} reflections
      </text>
    </motion.g>
  );
}

export function LineageGraph({ graph, activeAgentId, onSelectAgent, selectedAgentId }: Props) {
  if (graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-white/40 text-sm">
        No agents yet
      </div>
    );
  }

  const w = Math.max(graph.width, 300);
  const h = Math.max(graph.height, 200);

  return (
    <div className="overflow-auto w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        style={{ maxWidth: "100%" }}
      >
        <defs>
          <linearGradient id="edgeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#ec4899" stopOpacity={0.4} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        <g>
          {graph.edges.map((edge) => (
            <EdgePath key={`${edge.fromId}-${edge.toId}`} from={edge.fromId} to={edge.toId} graph={graph} />
          ))}
        </g>

        {/* Nodes */}
        <g>
          {graph.nodes.map((node) => (
            <AgentNode
              key={node.agent.id}
              node={node}
              isActive={node.agent.id === activeAgentId}
              isSelected={node.agent.id === selectedAgentId}
              onClick={() => onSelectAgent(node.agent.id)}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
