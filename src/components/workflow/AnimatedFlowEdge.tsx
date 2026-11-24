import React from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export interface AnimatedFlowEdgeData extends Record<string, unknown> {
  active: boolean;
  completed: boolean;
  failed: boolean;
}

export const AnimatedFlowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const edgeData = (data || {}) as AnimatedFlowEdgeData;
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = edgeData.failed
    ? '#ef4444'
    : edgeData.active
    ? '#60a5fa'
    : edgeData.completed
    ? '#34d399'
    : '#334155';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: edgeData.active ? 2.5 : 2,
          strokeDasharray: edgeData.active ? '6 4' : undefined,
          transition: 'stroke 250ms ease',
        }}
      />
      {edgeData.active && (
        <circle r="4" fill="#93c5fd" className="qz-edge-particle">
          <animateMotion dur="1.4s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
};
