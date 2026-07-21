import { useEffect, useRef } from 'preact/hooks';
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ChartType } from 'chart.js';

const useChart = (
    options: any,
    data: any,
    chartType: ChartType,
) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        
        if (!data) {
            console.log('No data provided to chart');
            return;
        }

        try {
            if (chartRef.current) {
                chartRef.current.destroy();
            }

            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) {
                console.error('Failed to get canvas context');
                return;
            }

            console.log('Creating chart with type:', chartType, 'data:', data);
            
            const config: ChartConfiguration = {
                type: chartType,
                data: data,
                options: {
                    ...options,
                    responsive: true,
                    maintainAspectRatio: false,
                },
            };
            
            chartRef.current = new Chart(ctx, config);
            console.log('Chart created successfully');
        } catch (error) {
            console.error('Error creating chart:', error);
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [data, options, chartType]);

    return { canvasRef, chartRef };
};

export default useChart;
