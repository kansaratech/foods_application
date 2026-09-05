'use client';

// A thin Chart.js wrapper used instead of `primereact/chart`. PrimeReact's
// <Chart> lazy-imports `chart.js/auto` at runtime, and in this Next dev/build
// setup that chunk can resolve to `/_next/undefined` → ChunkLoadError. Importing
// Chart.js statically here bundles it with the route and removes that failure.
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ChartData, ChartOptions, ChartType } from 'chart.js';

interface LineChartProps {
  type?: ChartType;
  // Callers seed this from `useState({})`, so accept an empty object too — the
  // chart is only created once `datasets` is present.
  data: ChartData | Record<string, never>;
  options?: ChartOptions | Record<string, unknown>;
  className?: string;
  height?: number;
}

export default function LineChart({
  type = 'line',
  data,
  options,
  className,
  height = 320,
}: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const hasData =
      data && Array.isArray((data as ChartData).datasets) && (data as ChartData).datasets.length > 0;
    if (!hasData) return;

    const config: ChartConfiguration = {
      type,
      data: data as ChartConfiguration['data'],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...(options ?? {}),
      },
    };

    if (chartRef.current) {
      chartRef.current.data = config.data;
      chartRef.current.options = config.options ?? {};
      chartRef.current.update();
    } else {
      chartRef.current = new Chart(ctx, config);
    }
  }, [type, data, options]);

  useEffect(() => {
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className={className} style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
