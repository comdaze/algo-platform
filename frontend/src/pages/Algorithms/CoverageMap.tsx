import React, { useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

// Simplified China GeoJSON - registered inline to avoid runtime fetch
const chinaGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    { type: 'Feature', properties: { name: '黑龙江' }, geometry: { type: 'Polygon', coordinates: [[[121.4, 53.3], [135.1, 53.3], [135.1, 43.4], [121.4, 43.4], [121.4, 53.3]]] } },
    { type: 'Feature', properties: { name: '新疆' }, geometry: { type: 'Polygon', coordinates: [[[73.5, 49.2], [96.4, 49.2], [96.4, 34.4], [73.5, 34.4], [73.5, 49.2]]] } },
    { type: 'Feature', properties: { name: '内蒙古' }, geometry: { type: 'Polygon', coordinates: [[[97.2, 53.3], [126.1, 53.3], [126.1, 37.4], [97.2, 37.4], [97.2, 53.3]]] } },
    { type: 'Feature', properties: { name: '宁夏' }, geometry: { type: 'Polygon', coordinates: [[[104.3, 39.4], [107.7, 39.4], [107.7, 35.2], [104.3, 35.2], [104.3, 39.4]]] } },
    { type: 'Feature', properties: { name: '甘肃' }, geometry: { type: 'Polygon', coordinates: [[[92.3, 42.8], [108.7, 42.8], [108.7, 32.6], [92.3, 32.6], [92.3, 42.8]]] } },
    { type: 'Feature', properties: { name: '河北' }, geometry: { type: 'Polygon', coordinates: [[[113.5, 42.6], [119.9, 42.6], [119.9, 36.1], [113.5, 36.1], [113.5, 42.6]]] } },
    { type: 'Feature', properties: { name: '辽宁' }, geometry: { type: 'Polygon', coordinates: [[[118.8, 43.5], [125.8, 43.5], [125.8, 38.7], [118.8, 38.7], [118.8, 43.5]]] } },
    { type: 'Feature', properties: { name: '吉林' }, geometry: { type: 'Polygon', coordinates: [[[121.6, 47.4], [131.3, 47.4], [131.3, 40.9], [121.6, 40.9], [121.6, 47.4]]] } },
    { type: 'Feature', properties: { name: '山东' }, geometry: { type: 'Polygon', coordinates: [[[114.8, 38.4], [122.7, 38.4], [122.7, 34.4], [114.8, 34.4], [114.8, 38.4]]] } },
    { type: 'Feature', properties: { name: '江苏' }, geometry: { type: 'Polygon', coordinates: [[[116.2, 35.1], [121.9, 35.1], [121.9, 30.8], [116.2, 30.8], [116.2, 35.1]]] } },
    { type: 'Feature', properties: { name: '广东' }, geometry: { type: 'Polygon', coordinates: [[[109.7, 25.5], [117.2, 25.5], [117.2, 20.2], [109.7, 20.2], [109.7, 25.5]]] } },
    { type: 'Feature', properties: { name: '云南' }, geometry: { type: 'Polygon', coordinates: [[[97.5, 29.2], [106.2, 29.2], [106.2, 21.1], [97.5, 21.1], [97.5, 29.2]]] } },
    { type: 'Feature', properties: { name: '四川' }, geometry: { type: 'Polygon', coordinates: [[[97.4, 34.3], [108.5, 34.3], [108.5, 26.1], [97.4, 26.1], [97.4, 34.3]]] } },
    { type: 'Feature', properties: { name: '湖北' }, geometry: { type: 'Polygon', coordinates: [[[108.4, 33.3], [116.1, 33.3], [116.1, 29.0], [108.4, 29.0], [108.4, 33.3]]] } },
    { type: 'Feature', properties: { name: '西藏' }, geometry: { type: 'Polygon', coordinates: [[[78.4, 36.5], [99.1, 36.5], [99.1, 26.9], [78.4, 26.9], [78.4, 36.5]]] } },
    { type: 'Feature', properties: { name: '青海' }, geometry: { type: 'Polygon', coordinates: [[[89.4, 39.2], [103.1, 39.2], [103.1, 31.6], [89.4, 31.6], [89.4, 39.2]]] } },
    { type: 'Feature', properties: { name: '陕西' }, geometry: { type: 'Polygon', coordinates: [[[105.5, 39.6], [111.2, 39.6], [111.2, 31.7], [105.5, 31.7], [105.5, 39.6]]] } },
    { type: 'Feature', properties: { name: '山西' }, geometry: { type: 'Polygon', coordinates: [[[110.2, 40.7], [114.6, 40.7], [114.6, 34.6], [110.2, 34.6], [110.2, 40.7]]] } },
    { type: 'Feature', properties: { name: '河南' }, geometry: { type: 'Polygon', coordinates: [[[110.4, 36.4], [116.7, 36.4], [116.7, 31.4], [110.4, 31.4], [110.4, 36.4]]] } },
    { type: 'Feature', properties: { name: '福建' }, geometry: { type: 'Polygon', coordinates: [[[115.8, 28.3], [120.7, 28.3], [120.7, 23.5], [115.8, 23.5], [115.8, 28.3]]] } },
  ],
};

// Mock coverage data
const coverageData = [
  { name: '黑龙江', value: 4.2, algorithms: 3 },
  { name: '新疆', value: 5.8, algorithms: 2 },
  { name: '内蒙古', value: 3.9, algorithms: 4 },
  { name: '宁夏', value: 7.1, algorithms: 1 },
  { name: '甘肃', value: 6.5, algorithms: 2 },
  { name: '河北', value: 4.5, algorithms: 3 },
  { name: '辽宁', value: 5.1, algorithms: 2 },
  { name: '吉林', value: 4.8, algorithms: 2 },
  { name: '山东', value: 11.2, algorithms: 1 },
  { name: '江苏', value: 3.2, algorithms: 3 },
];

const CoverageMap: React.FC = () => {
  useEffect(() => {
    // Register the map only once
    echarts.registerMap('china-simplified', chinaGeoJSON as unknown as Parameters<typeof echarts.registerMap>[1]);
  }, []);

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number; data?: { algorithms?: number } };
          if (p.value == null) {
            return `${p.name}<br/>No coverage`;
          }
          return `${p.name}<br/>Average MAPE: ${p.value}%<br/>Algorithms: ${p.data?.algorithms || 0}`;
        },
      },
      visualMap: {
        min: 0,
        max: 15,
        text: ['High MAPE', 'Low MAPE'],
        realtime: false,
        calculable: true,
        inRange: {
          color: ['#1d8102', '#f2a900', '#d13212'],
        },
      },
      series: [
        {
          name: 'Algorithm Coverage',
          type: 'map',
          map: 'china-simplified',
          roam: true,
          data: coverageData,
          emphasis: {
            label: {
              show: true,
            },
          },
        },
      ],
    }),
    []
  );

  return <ReactECharts option={option} style={{ height: '500px', width: '100%' }} />;
};

export default CoverageMap;
