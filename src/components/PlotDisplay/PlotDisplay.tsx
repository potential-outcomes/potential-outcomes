// src/components/PlotDisplay/PlotDisplay.tsx
'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PlotParams } from 'react-plotly.js';
import { Data, Layout } from 'plotly.js';
import { useTheme } from '../common/ThemeProvider';
import { 
  useSimulationState,
  useSimulationResults,
  SimulationResult,
  testStatistics,
  ExperimentalTestStatistic
} from '@/contexts/SimulationContext';

const PlotlyPlot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });

const StatDisplay: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="bg-light-background-secondary dark:bg-dark-background-tertiary p-3 rounded-lg flex items-center justify-evenly">
    <h4 className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">{title}</h4>
    <p className="text-m font-bold text-light-text-primary dark:text-dark-text-primary ml-2">{value}</p>
  </div>
);

export const PlotDisplay: React.FC = () => {
  const { theme } = useTheme();
  const { simulationResults, observedStatistic } = useSimulationResults();
  const { selectedTestStatistic, totalSimulations, pValue } = useSimulationState();
  const plotContainerRef = useRef<HTMLDivElement>(null);

  const calculatePlotData = useCallback((simulationData: number[], observedStat: number, theme: string) => {
    const numBins = 20;
    const minResult = Math.min(...simulationData, observedStat) - 1;
    const maxResult = Math.max(...simulationData, observedStat) + 1;
    const binSize = (maxResult - minResult) / numBins;

    const maxFrequency = Math.max(...Object.values(
      simulationData.reduce((acc, val) => {
        const bin = Math.floor((val - minResult) / binSize);
        acc[bin] = (acc[bin] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    ), 0);

    return [
      {
        x: simulationData,
        type: 'histogram',
        marker: {
          color: theme === 'light' ? 'rgba(66, 135, 245, 0.6)' : 'rgba(102, 187, 255, 0.6)',
          line: { color: theme === 'light' ? 'rgba(66, 135, 245, 1)' : 'rgba(102, 187, 255, 1)', width: 1 }
        },
        xbins: { start: minResult, end: maxResult, size: binSize },
        name: 'Simulated Differences',
      },
      {
        x: [observedStat, observedStat],
        y: [0, maxFrequency + 1],
        type: 'scatter',
        mode: 'lines',
        line: { color: theme === 'light' ? 'rgba(255, 0, 0, 0.7)' : 'rgba(255, 102, 102, 0.7)', width: 2 },
        name: 'Observed Difference',
      }
    ] as Data[];
  }, []);

  const plotLayout: Partial<Layout> = {
    xaxis: { 
      title: testStatistics[selectedTestStatistic].name,
      tickmode: 'auto',
      nticks: 10,
      tickfont: { color: theme === 'light' ? 'black' : 'white' },
      titlefont: { color: theme === 'light' ? 'black' : 'white' },
    },
    yaxis: { 
      title: 'Frequency',
      tickmode: 'auto',
      nticks: 10,
      tickfont: { color: theme === 'light' ? 'black' : 'white' },
      titlefont: { color: theme === 'light' ? 'black' : 'white' },
    },
    bargap: 0.05,
    showlegend: true,
    legend: { x: 0.7, y: 1, font: { color: theme === 'light' ? 'black' : 'white' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 45, r: 35, b: 35, t: 0 },
    autosize: true,
  };

  const simulationData = simulationResults
    ? simulationResults.map(result => result.getTestStatistic(selectedTestStatistic))
    : [];

  const plotData = calculatePlotData(simulationData, observedStatistic || 0, theme);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {});

    if (plotContainerRef.current) {
      resizeObserver.observe(plotContainerRef.current);
    }

    return () => {
      if (plotContainerRef.current) {
        resizeObserver.unobserve(plotContainerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div ref={plotContainerRef} className="flex-grow min-h-0">
        <PlotlyPlot
          data={plotData}
          layout={plotLayout}
          config={{ responsive: true }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <StatDisplay 
          title="Observed Statistic" 
          value={observedStatistic !== null ? observedStatistic.toFixed(4) : 'N/A'} 
        />
        <StatDisplay 
          title="P-value"
          value={pValue !== null && !isNaN(pValue) ? pValue.toFixed(4) : 'N/A'}
        />
        <StatDisplay 
          title="Current Progress" 
          value={`${simulationResults ? simulationResults.length : 0} / ${totalSimulations}`} 
        />
      </div>
    </div>
  );
};

export default PlotDisplay;