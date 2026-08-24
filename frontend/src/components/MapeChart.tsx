import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface DataPoint {
  date: string;
  value: number;
  province?: string;
}

interface MapeChartProps {
  data: DataPoint[];
  title?: string;
  timeRange?: string;
}

const MapeChart: React.FC<MapeChartProps> = ({ data, title, timeRange: _timeRange }) => {
  const option: EChartsOption = useMemo(() => {
    // Group data by province for multi-series
    const grouped: Record<string, DataPoint[]> = {};
    data.forEach((d) => {
      const key = d.province || 'Overall';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d);
    });

    const series = Object.entries(grouped).map(([name, points]) => ({
      name,
      type: 'line' as const,
      data: points.map((p) => [p.date, p.value]),
      smooth: true,
    }));

    return {
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        bottom: 0,
        type: 'scroll',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
        },
      },
      series,
    };
  }, [data, title]);

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
};

export default MapeChart;
