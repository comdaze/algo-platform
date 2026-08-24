import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { PipelineStep } from '../types';

interface PipelineDAGProps {
  steps: PipelineStep[];
  onNodeClick?: (stepName: string) => void;
}

const statusColors: Record<string, string> = {
  Succeeded: '#1d8102',
  Executing: '#0972d3',
  Failed: '#d13212',
  NotStarted: '#aaaaaa',
  Stopping: '#f2a900',
};

const PipelineDAG: React.FC<PipelineDAGProps> = ({ steps, onNodeClick }) => {
  const option: EChartsOption = useMemo(() => {
    const nodeSpacingX = 180;
    const nodeSpacingY = 80;
    const cols = Math.min(steps.length, 3);

    const nodes = steps.map((step, index) => ({
      name: step.name,
      x: (index % cols) * nodeSpacingX,
      y: Math.floor(index / cols) * nodeSpacingY,
      itemStyle: {
        color: statusColors[step.status] || '#aaaaaa',
      },
      symbolSize: 50,
    }));

    // Create edges connecting sequential steps
    const edges = steps.slice(1).map((step, index) => ({
      source: steps[index].name,
      target: step.name,
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name?: string; dataType?: string };
          if (p.dataType === 'node') {
            const step = steps.find((s) => s.name === p.name);
            return `${p.name}<br/>Status: ${step?.status || 'Unknown'}`;
          }
          return '';
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'none',
          roam: true,
          label: {
            show: true,
            fontSize: 10,
          },
          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [4, 10],
          data: nodes,
          links: edges,
          lineStyle: {
            opacity: 0.9,
            width: 2,
            curveness: 0,
          },
        },
      ],
    };
  }, [steps]);

  const onEvents = useMemo(
    () => ({
      click: (params: { dataType?: string; name?: string }) => {
        if (params.dataType === 'node' && params.name && onNodeClick) {
          onNodeClick(params.name);
        }
      },
    }),
    [onNodeClick]
  );

  return <ReactECharts option={option} style={{ height: '500px', width: '100%' }} onEvents={onEvents} />;
};

export default PipelineDAG;
