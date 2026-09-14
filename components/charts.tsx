'use client';

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Experiment, Transaction } from '@/lib/types';

type RevenueDatum = { m: string; actual: number; forecast: number };

const grid = 'rgba(151,168,198,.14)';
const tick = { fill: '#91a0b9', fontSize: 11 };
const tooltipStyle = {
  background: '#0d131f',
  border: '1px solid rgba(151,168,198,.28)',
  borderRadius: 8,
  color: '#edf3ff',
  fontSize: 12,
};

export function RevenueTrendChart({ data, label = 'Revenue actuals and forecast by month' }: { data: RevenueDatum[]; label?: string }) {
  return (
    <div className="chart-wrap" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity={0.38} />
              <stop offset="100%" stopColor="#5eead4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 5" />
          <XAxis dataKey="m" axisLine={false} tickLine={false} tick={tick} />
          <YAxis axisLine={false} tickLine={false} tick={tick} unit="k" width={40} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(94,234,212,.45)', strokeWidth: 1 }} />
          <Legend wrapperStyle={{ color: '#91a0b9', fontSize: 11, paddingTop: 8 }} />
          <Area type="monotone" dataKey="actual" name="Posted actual" stroke="#5eead4" strokeWidth={2.4} fill="url(#revenueActual)" />
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#9b8cff" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExperimentPerformanceChart({ experiments }: { experiments: Experiment[] }) {
  const data = experiments.slice(0, 8).map((experiment, index) => ({
    name: `E${index + 1}`,
    progress: experiment.progress,
    spend: Math.round(experiment.spend / 100) / 10,
    status: experiment.status,
  }));
  return (
    <div className="chart-wrap" role="img" aria-label="Experiment completion percentage and spend in hundreds of dollars for the first eight seeded experiments">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 5" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={tick} />
          <YAxis yAxisId="progress" domain={[0, 100]} axisLine={false} tickLine={false} tick={tick} unit="%" width={38} />
          <YAxis yAxisId="spend" orientation="right" axisLine={false} tickLine={false} tick={tick} unit="h" width={34} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,.035)' }} />
          <Legend wrapperStyle={{ color: '#91a0b9', fontSize: 11, paddingTop: 8 }} />
          <Bar yAxisId="progress" dataKey="progress" name="Completion" fill="#5eead4" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Line yAxisId="spend" type="monotone" dataKey="spend" name="Spend ($100s)" stroke="#fbad62" strokeWidth={2} dot={{ r: 3, fill: '#fbad62' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashFlowChart({ transactions }: { transactions: Transaction[] }) {
  const grouped = transactions.reduce<Record<string, { date: string; inflow: number; outflow: number }>>((rows, transaction) => {
    const row = rows[transaction.date] ?? { date: transaction.date, inflow: 0, outflow: 0 };
    if (transaction.direction === 'in') row.inflow += transaction.amount;
    else row.outflow -= transaction.amount;
    rows[transaction.date] = row;
    return rows;
  }, {});
  const data = Object.values(grouped).reverse();

  return (
    <div className="chart-wrap compact" role="img" aria-label="Ledger cash flow by transaction date, with inflows above and outflows below zero">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 5" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={tick} />
          <YAxis axisLine={false} tickLine={false} tick={tick} tickFormatter={(value) => `$${Math.abs(value) / 1000}k`} width={48} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,.035)' }} formatter={(value) => `$${Math.abs(Number(value)).toLocaleString('en-US')}`} />
          <Legend wrapperStyle={{ color: '#91a0b9', fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="inflow" name="Inflow" fill="#5eead4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outflow" name="Outflow" fill="#fbad62" radius={[0, 0, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
