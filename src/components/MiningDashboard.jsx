import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import './MiningDashboard.css';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const EF = {
  diesel:      2.68,
  petrol:      2.31,
  electricity: 0.82,
  methane:     28,
  explosives:  0.17,
};

const COLORS = {
  diesel:      '#f59e0b',
  petrol:      '#3b82f6',
  electricity: '#8b5cf6',
  methane:     '#ef4444',
  explosives:  '#ec4899',
  total:       '#10b981',
};

const CATS = ['diesel', 'petrol', 'electricity', 'methane', 'explosives'];

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#f8fafc',
  fontSize: '0.82rem',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt    = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0);
const fmtT   = (n) => (n / 1000).toFixed(2) + ' t';   // kg → tonnes
const pct    = (a, b) => b ? (((a - b) / b) * 100).toFixed(1) : null;

function rowToEmissions(row) {
  const d = (row.diesel      || 0) * EF.diesel;
  const p = (row.petrol      || 0) * EF.petrol;
  const e = (row.electricity || 0) * EF.electricity;
  const m = (row.methane     || 0) * EF.methane;
  const x = (row.explosives  || 0) * EF.explosives;
  return { diesel: d, petrol: p, electricity: e, methane: m, explosives: x, total: d + p + e + m + x };
}

function makeBlank(label) {
  return { label, diesel: 0, petrol: 0, electricity: 0, methane: 0, explosives: 0, total: 0 };
}

function aggregateByDay(rows) {
  const map = {};
  rows.forEach(row => {
    const key = row.created_at.slice(0, 10);
    if (!map[key]) map[key] = makeBlank(key);
    const e = rowToEmissions(row);
    CATS.forEach(c => { map[key][c] += e[c]; });
    map[key].total += e.total;
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}

function aggregateByMonth(rows) {
  const map = {};
  rows.forEach(row => {
    const d = new Date(row.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = makeBlank(key);
    const e = rowToEmissions(row);
    CATS.forEach(c => { map[key][c] += e[c]; });
    map[key].total += e.total;
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}

function aggregateByYear(rows) {
  const map = {};
  rows.forEach(row => {
    const key = String(new Date(row.created_at).getUTCFullYear());
    if (!map[key]) map[key] = makeBlank(key);
    const e = rowToEmissions(row);
    CATS.forEach(c => { map[key][c] += e[c]; });
    map[key].total += e.total;
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, unit, sub, color, delta }) {
  const up = delta > 0;
  return (
    <div className="mdb__kpi">
      <div className="mdb__kpi-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="mdb__kpi-body">
        <div className="mdb__kpi-label">{label}</div>
        <div className="mdb__kpi-value" style={{ color }}>
          {value} <span className="mdb__kpi-unit">{unit}</span>
        </div>
        <div className="mdb__kpi-sub">
          {delta != null && (
            <span className={`mdb__delta ${up ? 'mdb__delta--up' : 'mdb__delta--down'}`}>
              {up ? '▲' : '▼'} {Math.abs(delta)}%
            </span>
          )}
          {sub}
        </div>
      </div>
    </div>
  );
}

function SectionTab({ id, label, icon, active, onClick }) {
  return (
    <button
      className={`mdb__tab ${active ? 'mdb__tab--active' : ''}`}
      onClick={() => onClick(id)}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="mdb__empty">
      <div className="mdb__empty-icon">{icon}</div>
      <p>{text}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="mdb__loading">
      <div className="mdb__spinner" />
      <p>Fetching emission data from Supabase…</p>
    </div>
  );
}

// Custom donut label
function DonutLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" fill="#f8fafc" dominantBaseline="middle">
      <tspan x={cx} dy="-0.6em" fontSize="1.4rem" fontWeight="700">{(total / 1000).toFixed(1)}</tspan>
      <tspan x={cx} dy="1.5em" fontSize="0.72rem" fill="#94a3b8">tonnes CO₂e</tspan>
    </text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart panels
// ─────────────────────────────────────────────────────────────────────────────
function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="mdb__chart-card">
      <div className="mdb__chart-header">
        <div>
          <div className="mdb__chart-title">{title}</div>
          {subtitle && <div className="mdb__chart-sub">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function DataTable({ rows, cols }) {
  return (
    <div className="mdb__table-wrap">
      <table className="mdb__table">
        <thead>
          <tr>
            {cols.map(c => <th key={c.key} style={{ color: c.color }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map(c => (
                <td key={c.key} style={{ color: c.color, fontWeight: c.bold ? 700 : 400 }}>
                  {c.format ? c.format(row[c.key]) : fmt(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function MiningDashboard({ mineId: lockedMineId = '' }) {
  const [rows,    setRows]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [view,    setView]    = useState('daily');   // 'daily' | 'monthly' | 'yearly'

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!lockedMineId) return;
    setLoading(true);
    setError(null);
    setRows(null);
    const { data, error: err } = await supabase
      .from('mining')
      .select('created_at, diesel, petrol, electricity, methane, explosives, workers')
      .eq('mineid', lockedMineId)
      .order('created_at', { ascending: true });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setRows(data ?? []);
  }, [lockedMineId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Aggregations ────────────────────────────────────────────────────────────
  const daily   = useMemo(() => rows ? aggregateByDay(rows)   : [], [rows]);
  const monthly = useMemo(() => rows ? aggregateByMonth(rows) : [], [rows]);
  const yearly  = useMemo(() => rows ? aggregateByYear(rows)  : [], [rows]);

  const viewData = view === 'daily' ? daily : view === 'monthly' ? monthly : yearly;

  const totalCO2   = useMemo(() => rows ? rows.reduce((s, r) => s + rowToEmissions(r).total, 0) : 0, [rows]);
  const avgDay     = daily.length   ? totalCO2 / daily.length   : 0;
  const avgMonth   = monthly.length ? totalCO2 / monthly.length : 0;
  const latestDay  = daily.at(-1);
  const prevDay    = daily.at(-2);
  const dayDelta   = (latestDay && prevDay) ? pct(latestDay.total, prevDay.total) : null;

  // Donut breakdown (all-time totals per category)
  const donutData = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const agg = { diesel: 0, petrol: 0, electricity: 0, methane: 0, explosives: 0 };
    rows.forEach(r => {
      const e = rowToEmissions(r);
      CATS.forEach(c => { agg[c] += e[c]; });
    });
    return CATS.map(c => ({ name: c.charAt(0).toUpperCase() + c.slice(1), value: Math.round(agg[c]), color: COLORS[c] }))
               .filter(d => d.value > 0);
  }, [rows]);

  // ── Table columns config ───────────────────────────────────────────────────
  const tableCols = [
    { key: 'label',       label: 'Period',         format: v => v,            color: '#f8fafc', bold: true },
    { key: 'total',       label: 'Total (kg CO₂e)',format: fmt,               color: COLORS.total, bold: true },
    { key: 'diesel',      label: 'Diesel',         format: fmt,               color: COLORS.diesel },
    { key: 'petrol',      label: 'Petrol',         format: fmt,               color: COLORS.petrol },
    { key: 'electricity', label: 'Electricity',    format: fmt,               color: COLORS.electricity },
    { key: 'methane',     label: 'Methane',        format: fmt,               color: COLORS.methane },
    { key: 'explosives',  label: 'Explosives',     format: fmt,               color: COLORS.explosives },
  ];

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;
  if (error)   return (
    <div className="mdb__error">
      <span>❌</span> {error}
      <button className="mdb__retry" onClick={fetchData}>Retry</button>
    </div>
  );
  if (!rows || rows.length === 0) return (
    <EmptyState icon="📭" text={`No emission records found for mine "${lockedMineId}". Submit your first daily log to see the dashboard.`} />
  );

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="mdb fade-in">

      {/* ── Top header strip ── */}
      <div className="mdb__header">
        <div>
          <h2 className="mdb__title">Carbon Emissions Dashboard</h2>
          <p className="mdb__subtitle">
            Mine <strong style={{ color: '#10b981' }}>{lockedMineId}</strong> · {rows.length} records ·{' '}
            <span style={{ color: '#94a3b8' }}>Last updated {rows.at(-1)?.created_at?.slice(0, 10)}</span>
          </p>
        </div>
        <button className="mdb__refresh" onClick={fetchData} title="Refresh data">
          🔄 Refresh
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div className="mdb__kpi-grid">
        <KpiCard
          icon="🔥" label="Total CO₂e (All Time)"
          value={fmt(totalCO2)} unit="kg"
          sub={`≈ ${fmtT(totalCO2)}`}
          color="#ef4444"
        />
        <KpiCard
          icon="📅" label="Today / Latest Day"
          value={fmt(latestDay?.total)} unit="kg"
          sub={latestDay?.label ?? '—'}
          color="#f59e0b"
          delta={dayDelta != null ? parseFloat(dayDelta) : null}
        />
        <KpiCard
          icon="📆" label="Avg Daily Emission"
          value={fmt(avgDay)} unit="kg/day"
          sub={`Across ${daily.length} day${daily.length !== 1 ? 's' : ''}`}
          color="#3b82f6"
        />
        <KpiCard
          icon="🗓️" label="Avg Monthly Emission"
          value={fmt(avgMonth)} unit="kg/mo"
          sub={`Across ${monthly.length} month${monthly.length !== 1 ? 's' : ''}`}
          color="#8b5cf6"
        />
        <KpiCard
          icon="📊" label="Records Logged"
          value={rows.length} unit="entries"
          sub={`${yearly.length} year${yearly.length !== 1 ? 's' : ''} of data`}
          color="#10b981"
        />
      </div>

      {/* ── Donut + Top Source row ── */}
      <div className="mdb__two-col" style={{ marginBottom: '1.5rem' }}>

        <ChartPanel title="🍩 All-Time Source Breakdown" subtitle="Share of total CO₂e by emission source">
          <div style={{ height: 260, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData} dataKey="value"
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={110}
                  paddingAngle={3} stroke="none"
                  labelLine={false}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <DonutLabel cx={donutData.length ? undefined : 160} cy={130} total={totalCO2} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val, name) => [`${fmt(val)} kg (${((val / totalCO2) * 100).toFixed(1)}%)`, name]}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(v, e) => <span style={{ color: e.color, fontSize: '0.78rem' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        {/* Source breakdown bars */}
        <ChartPanel title="📊 Source Totals (All Time)" subtitle="kg CO₂e per emission category">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={donutData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${fmt(v)} kg CO₂e`]} />
                <Bar dataKey="value" name="CO₂e" radius={[0, 6, 6, 0]}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* ── Time view tabs ── */}
      <div className="mdb__tabs">
        <SectionTab id="daily"   label="Daily"   icon="📅" active={view === 'daily'}   onClick={setView} />
        <SectionTab id="monthly" label="Monthly" icon="📆" active={view === 'monthly'} onClick={setView} />
        <SectionTab id="yearly"  label="Yearly"  icon="🗓️" active={view === 'yearly'}  onClick={setView} />
      </div>

      {viewData.length === 0 ? (
        <EmptyState icon="📭" text="No data available for this view." />
      ) : (
        <>
          {/* ── Area: Total CO₂ trend ── */}
          <ChartPanel
            title={`📈 Total CO₂e — ${view.charAt(0).toUpperCase() + view.slice(1)} Trend`}
            subtitle={`kg CO₂e emitted per ${view === 'daily' ? 'day' : view === 'monthly' ? 'month' : 'year'}`}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${fmt(v)} kg CO₂e`, 'Total']} />
                  <Area
                    type="monotone" dataKey="total" name="Total CO₂e"
                    stroke="#10b981" strokeWidth={2.5}
                    fill="url(#gradTotal)"
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          {/* ── Stacked bar by source ── */}
          <ChartPanel
            title={`📊 Emissions by Source — ${view.charAt(0).toUpperCase() + view.slice(1)} Breakdown`}
            subtitle="Stacked kg CO₂e · Diesel · Petrol · Electricity · Methane · Explosives"
          >
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${fmt(v)} kg`, n]} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v, e) => <span style={{ color: e.color, fontSize: '0.78rem' }}>{v}</span>} />
                  {CATS.map(cat => (
                    <Bar
                      key={cat} dataKey={cat} stackId="a"
                      name={cat.charAt(0).toUpperCase() + cat.slice(1)}
                      fill={COLORS[cat]}
                      radius={cat === 'explosives' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          {/* ── Multi-line per source ── */}
          <ChartPanel
            title={`📉 Source-wise Trend Lines — ${view.charAt(0).toUpperCase() + view.slice(1)}`}
            subtitle="Individual CO₂e contribution per emission source"
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={viewData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${fmt(v)} kg`, n]} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v, e) => <span style={{ color: e.color, fontSize: '0.78rem' }}>{v}</span>} />
                  {CATS.map(cat => (
                    <Line
                      key={cat} type="monotone" dataKey={cat}
                      name={cat.charAt(0).toUpperCase() + cat.slice(1)}
                      stroke={COLORS[cat]} strokeWidth={2}
                      dot={false} activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          {/* ── Data table ── */}
          <div className="mdb__chart-card">
            <div className="mdb__chart-header">
              <div>
                <div className="mdb__chart-title">
                  🗄️ {view.charAt(0).toUpperCase() + view.slice(1)} Summary Table
                </div>
                <div className="mdb__chart-sub">All values in kg CO₂e</div>
              </div>
            </div>
            <DataTable rows={[...viewData].reverse()} cols={tableCols} />
          </div>
        </>
      )}
    </div>
  );
}
