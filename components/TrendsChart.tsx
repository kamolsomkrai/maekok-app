// components/TrendsChart.tsx
'use client' // Added 'use client' for client-side rendering

import { Skeleton } from '@/components/ui/skeleton';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';


// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
Chart.register(ChartDataLabels);
interface TrendData {
  date: string;
  "จำนวนผู้ป่วย": number;
}

interface TrendsChartProps {
  data: TrendData[];
  loading: boolean;
}

const TrendsChart: React.FC<TrendsChartProps> = ({ data, loading }) => {
  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'จำนวนผู้ป่วย',
        data: data.map(item => item["จำนวนผู้ป่วย"]),
        borderColor: '#0369a1',
        backgroundColor: 'rgba(3, 105, 161, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#0369a1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4, // Make the line smoother
        fill: true
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          color: '#0c4a6e'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#0c4a6e',
        bodyColor: '#0c4a6e',
        borderColor: '#38bdf8',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12
      },
      datalabels: {
        display: false, // You can turn this on to show labels on data points
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#0c4a6e',
          font: {
            size: 12
          },
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          color: '#e0f2fe',
          drawBorder: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#0c4a6e',
          font: {
            size: 12
          }
        },
        grid: {
          color: '#e0f2fe',
          drawBorder: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  // --- REMOVED Card & CardContent Wrapper ---
  // The component now returns the content directly.
  if (loading) {
    return <Skeleton className="h-full w-full" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-blue-600">
        <div className="text-center">
          <div className="text-lg font-medium">ไม่มีข้อมูลสำหรับแสดงกราฟ</div>
          <div className="text-sm mt-2">ลองเปลี่ยนเงื่อนไขการค้นหา</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default TrendsChart;