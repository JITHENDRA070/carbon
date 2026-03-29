import React, { useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';

// ------------------------------------------------------------------
// Emission factors (kg CO2e per unit)
// ------------------------------------------------------------------
const EF = {
  diesel:      2.68,  // per litre
  petrol:      2.31,  // per litre
  electricity: 0.82,  // per kWh
  methane:     28,    // per kg (GWP-100)
  explosives:  0.17   // per kg
};

/** Convert one raw mining row into kg CO2e values per category */
function rowToEmissions(row) {
  return {
    diesel:      (row.diesel      || 0) * EF.diesel,
    petrol:      (row.petrol      || 0) * EF.petrol,
    electricity: (row.electricity || 0) * EF.electricity,
    methane:     (row.methane     || 0) * EF.methane,
    explosives:  (row.explosives  || 0) * EF.explosives,
    total() { return this.diesel + this.petrol + this.electricity + this.methane + this.explosives; }
  };
}

const CHART_COLORS = {
  total:       '#10b981',
  diesel:      '#f59e0b',
  petrol:      '#3b82f6',
  electricity: '#8b5cf6',
  methane:     '#ef4444',
  explosives:  '#ec4899'
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

// ------------------------------------------------------------------
// Aggregation helpers
// ------------------------------------------------------------------
function aggregateByDay(rows) {
  const map = {};
  rows.forEach(row => {
    const key = row.created_at.slice(0, 10); // YYYY-MM-DD
    if (!map[key]) map[key] = { label: key, diesel: 0, petrol: 0, electricity: 0, methane: 0, explosives: 0, total: 0 };
    const e = rowToEmissions(row);
    map[key].diesel      += e.diesel;
    map[key].petrol      += e.petrol;
    map[key].electricity += e.electricity;
    map[key].methane     += e.methane;
    map[key].explosives  += e.explosives;
    map[key].total       += e.total();
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}

function aggregateByMonth(rows) {
  const map = {};
  rows.forEach(row => {
    const d     = new Date(row.created_at);
    const year  = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const key   = `${year}-${month}`;
    if (!map[key]) map[key] = { label: key, diesel: 0, petrol: 0, electricity: 0, methane: 0, explosives: 0, total: 0 };
    const e = rowToEmissions(row);
    map[key].diesel      += e.diesel;
    map[key].petrol      += e.petrol;
    map[key].electricity += e.electricity;
    map[key].methane     += e.methane;
    map[key].explosives  += e.explosives;
    map[key].total       += e.total();
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}

function aggregateByYear(rows) {
  const map = {};
  rows.forEach(row => {
    const key = String(new Date(row.created_at).getUTCFullYear());
    if (!map[key]) map[key] = { label: key, diesel: 0, petrol: 0, electricity: 0, methane: 0, explosives: 0, total: 0 };
    const e = rowToEmissions(row);
    map[key].diesel      += e.diesel;
    map[key].petrol      += e.petrol;
    map[key].electricity += e.electricity;
    map[key].methane     += e.methane;
    map[key].explosives  += e.explosives;
    map[key].total       += e.total();
  });
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}

// ------------------------------------------------------------------
// Tooltip formatter
// ------------------------------------------------------------------
const tooltipStyle = { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' };
const tooltipFormatter = (val) => [`${fmt(val)} kg CO₂e`];

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
export default function MiningDashboard() {
  const [mineId,   setMineId]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [rows,     setRows]     = useState(null); // null = not fetched yet

  const fetchData = useCallback(async () => {
    if (!mineId.trim()) return;
    setLoading(true);
    setError(null);
    setRows(null);
    const { data, error: err } = await supabase
      .from('mining')
      .select('created_at, diesel, petrol, electricity, methane, explosives')
      .eq('mineid', mineId.trim())
      .order('created_at', { ascending: true });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setRows(data);
  }, [mineId]);

  // Aggregate only when rows exist
  const daily   = rows ? aggregateByDay(rows)   : [];
  const monthly = rows ? aggregateByMonth(rows) : [];
  const yearly  = rows ? aggregateByYear(rows)  : [];

  const totalCO2 = rows
    ? rows.reduce((sum, r) => sum + rowToEmissions(r).total(), 0)
    : 0;

  const categories = ['diesel', 'petrol', 'electricity', 'methane', 'explosives'];

  return (
    <div className="fade-in">
      {/* Mine Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Mine ID</label>
          <input
            type="text"
            value={mineId}
            onChange={e => setMineId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            placeholder="e.g. IND-COAL-01"
            style={{ fontSize: '1rem' }}
          />
        </div>
        <button
          className="btn-primary"
          onClick={fetchData}
          disabled={loading || !mineId.trim()}
          style={{ opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}
        >
          {loading ? '⏳ Loading…' : '🔍 Fetch Emissions'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '1.5rem' }}>
          ❌ {error}
        </div>
      )}

      {/* No data yet */}
      {rows === null && !loading && !error && (
        <div className="kpi-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛏️</div>
          <p>Enter a Mine ID and click "Fetch Emissions" to load the dashboard.</p>
        </div>
      )}

      {/* Empty results */}
      {rows !== null && rows.length === 0 && (
        <div className="kpi-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <p>No records found for Mine ID <strong>"{mineId}"</strong>.</p>
        </div>
      )}

      {/* Results */}
      {rows && rows.length > 0 && (
        <>
          {/* KPI Summary Row */}
          <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
            <div className="kpi-card">
              <div className="kpi-title">📦 Total Records</div>
              <div className="kpi-value">{rows.length}</div>
              <div className="kpi-trend">For Mine: {mineId}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">🔥 Total CO₂ Emissions</div>
              <div className="kpi-value" style={{ color: 'var(--accent-red)' }}>
                {fmt(totalCO2)} <span style={{ fontSize: '1rem' }}>kg CO₂e</span>
              </div>
              <div className="kpi-trend">All time</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">📅 Avg Daily Emission</div>
              <div className="kpi-value" style={{ color: 'var(--accent-orange)' }}>
                {fmt(daily.length ? totalCO2 / daily.length : 0)} <span style={{ fontSize: '1rem' }}>kg/day</span>
              </div>
              <div className="kpi-trend">Across {daily.length} days</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">🗓️ Avg Monthly Emission</div>
              <div className="kpi-value" style={{ color: 'var(--accent-purple)' }}>
                {fmt(monthly.length ? totalCO2 / monthly.length : 0)} <span style={{ fontSize: '1rem' }}>kg/mo</span>
              </div>
              <div className="kpi-trend">Across {monthly.length} months</div>
            </div>
          </div>

          {/* ── Line Chart: Daily CO₂ Trend ─────────────────────── */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-header">
              <h3>📈 Daily CO₂ Emissions — Line Trend</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total kg CO₂e emitted per day</p>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
                  <Line type="monotone" dataKey="total" name="Total CO₂e" stroke={CHART_COLORS.total} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.total }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Line Chart: Monthly CO₂ Trend ───────────────────── */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-header">
              <h3>📈 Monthly CO₂ Emissions — Line Trend</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aggregated monthly total kg CO₂e</p>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
                  <Line type="monotone" dataKey="total" name="Monthly CO₂e" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Bar Chart: Categorised Daily Emissions ───────────── */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-header">
              <h3>📊 Daily Categorised Emissions — Stacked Bar</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Breakdown by source: Diesel · Petrol · Electricity · Methane · Explosives</p>
            </div>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${fmt(v)} kg`, n]} />
                  <Legend iconType="circle" />
                  {categories.map(cat => (
                    <Bar key={cat} dataKey={cat} name={cat.charAt(0).toUpperCase() + cat.slice(1)} stackId="a" fill={CHART_COLORS[cat]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-column bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

            {/* ── Bar Chart: Monthly Categorised ──────────────────── */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>📊 Monthly Categorised Emissions</h3>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${fmt(v)} kg`, n]} />
                    <Legend iconType="circle" />
                    {categories.map(cat => (
                      <Bar key={cat} dataKey={cat} name={cat.charAt(0).toUpperCase() + cat.slice(1)} stackId="a" fill={CHART_COLORS[cat]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Bar Chart: Yearly CO₂ Growth ────────────────────── */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>📊 Yearly CO₂ Growth</h3>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearly} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${fmt(v)} kg CO₂e`, n]} />
                    <Legend iconType="circle" />
                    {categories.map(cat => (
                      <Bar key={cat} dataKey={cat} name={cat.charAt(0).toUpperCase() + cat.slice(1)} stackId="a" fill={CHART_COLORS[cat]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ── Raw Data Table ───────────────────────────────────── */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>🗄️ Yearly Summary Table</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                    {['Year', 'Diesel (kg)', 'Petrol (kg)', 'Electricity (kg)', 'Methane (kg)', 'Explosives (kg)', 'Total CO₂e (kg)'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearly.map(row => (
                    <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{row.label}</td>
                      <td style={{ padding: '0.75rem', color: CHART_COLORS.diesel }}>{fmt(row.diesel)}</td>
                      <td style={{ padding: '0.75rem', color: CHART_COLORS.petrol }}>{fmt(row.petrol)}</td>
                      <td style={{ padding: '0.75rem', color: CHART_COLORS.electricity }}>{fmt(row.electricity)}</td>
                      <td style={{ padding: '0.75rem', color: CHART_COLORS.methane }}>{fmt(row.methane)}</td>
                      <td style={{ padding: '0.75rem', color: CHART_COLORS.explosives }}>{fmt(row.explosives)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
