import React, { useState, useMemo } from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { FaChartBar, FaSeedling, FaCoins, FaFire, FaTree, FaBalanceScale, FaTrophy } from "react-icons/fa";

const TREE_ABSORPTION_YR    = 21;
const HECTARE_ABSORPTION_YR = 10_000;
const CARBON_CREDIT_TONNE   = 1_000;
const CREDIT_PRICE_USD      = 15;
const USD_TO_INR            = 83.5;

const fmt     = (n, d = 0) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: d }).format(n);
const fmtCurr = (n, sym = '₹') => `${sym} ${fmt(Math.abs(n), 0)}`;
const tipStyle = { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' };

function StatCard({ title, value, unit, color = 'var(--text-main)', sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value" style={{ color, fontSize: '1.8rem' }}>
        {value} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      {sub && <div className="kpi-trend">{sub}</div>}
    </div>
  );
}

export default function CarbonSinkModule() {
  const [totalEmissions, setTotalEmissions] = useState(15000);
  const [trees,    setTrees]    = useState(5000);
  const [hectares, setHectares] = useState(120);
  const [period, setPeriod] = useState('daily');

  const periodFactor = { daily: 1 / 365, monthly: 1 / 12, yearly: 1 };
  const result = useMemo(() => {
    const pf = periodFactor[period];

    const treeSink     = trees    * TREE_ABSORPTION_YR    * pf;
    const hectareSink  = hectares * HECTARE_ABSORPTION_YR * pf;
    const totalSink    = treeSink + hectareSink;
    const scaledEmissions = period === 'daily'
      ? totalEmissions
      : period === 'monthly'
        ? totalEmissions * 30
        : totalEmissions * 365;

    const gap            = scaledEmissions - totalSink;
    const isNeutral      = gap <= 0;
    const surplusOrGap   = Math.abs(gap);
    const treesNeeded    = isNeutral ? 0 : gap / (TREE_ABSORPTION_YR * pf);
    const hectaresNeeded = isNeutral ? 0 : gap / (HECTARE_ABSORPTION_YR * pf);
    const creditsEarned   = isNeutral ? surplusOrGap / CARBON_CREDIT_TONNE : 0;
    const marketValueUSD  = creditsEarned * CREDIT_PRICE_USD;
    const marketValueINR  = marketValueUSD * USD_TO_INR;

    const coveragePct     = Math.min(100, (totalSink / scaledEmissions) * 100);

    return {
      treeSink, hectareSink, totalSink, scaledEmissions,
      gap, isNeutral, surplusOrGap,
      treesNeeded, hectaresNeeded,
      creditsEarned, marketValueUSD, marketValueINR,
      coveragePct
    };
  }, [trees, hectares, totalEmissions, period]);

  const barData = [
    { name: 'Emissions', value: Math.round(result.scaledEmissions), fill: '#ef4444' },
    { name: 'Tree Sink', value: Math.round(result.treeSink),        fill: '#10b981' },
    { name: 'Area Sink', value: Math.round(result.hectareSink),     fill: '#3b82f6' },
    { name: 'Gap',       value: Math.round(Math.max(0, result.gap)),fill: '#f59e0b' },
  ];
  const radialData = [{ name: 'Coverage', value: result.coveragePct, fill: result.isNeutral ? '#10b981' : '#f59e0b' }];

  const periodLabel = { daily: 'Day', monthly: 'Month', yearly: 'Year' }[period];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        {['daily', 'monthly', 'yearly'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={period === p ? 'btn-primary' : 'btn-outline'}
            style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-title"><FaFire /> Total Emissions (kg CO₂e / day)</div>
          <input
            type="number"
            value={totalEmissions}
            onChange={e => setTotalEmissions(parseFloat(e.target.value) || 0)}
            style={{
              background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)',
              borderRadius: '8px', padding: '0.6rem 0.9rem', color: '#ef4444',
              fontFamily: 'inherit', fontSize: '1.5rem', fontWeight: 700,
              width: '100%', marginTop: '0.5rem'
            }}
          />
          <div className="kpi-trend">Enter your mine's daily emissions figure</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title"><FaTree /> Trees Planted (total)</div>
          <input
            type="number"
            value={trees}
            onChange={e => setTrees(parseInt(e.target.value) || 0)}
            style={{
              background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)',
              borderRadius: '8px', padding: '0.6rem 0.9rem', color: '#10b981',
              fontFamily: 'inherit', fontSize: '1.5rem', fontWeight: 700,
              width: '100%', marginTop: '0.5rem'
            }}
          />
          <div className="kpi-trend">Absorbs ~{TREE_ABSORPTION_YR} kg CO₂/tree/year</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title"><FaSeedling /> Forest Area (hectares)</div>
          <input
            type="number"
            value={hectares}
            onChange={e => setHectares(parseFloat(e.target.value) || 0)}
            style={{
              background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)',
              borderRadius: '8px', padding: '0.6rem 0.9rem', color: '#3b82f6',
              fontFamily: 'inherit', fontSize: '1.5rem', fontWeight: 700,
              width: '100%', marginTop: '0.5rem'
            }}
          />
          <div className="kpi-trend">Absorbs ~{fmt(HECTARE_ABSORPTION_YR)} kg CO₂/ha/year</div>
        </div>
      </div>

      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        background: result.isNeutral
          ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))'
          : 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
        border: `1px solid ${result.isNeutral ? '#10b981' : '#f59e0b'}`,
        marginBottom: '2rem',
        display: 'flex', alignItems: 'center', gap: '1rem'
      }}>
        <span style={{ fontSize: '2rem' }}>{result.isNeutral ? <FaTrophy /> : ''}</span>
        <div>
          <strong style={{ fontSize: '1.1rem', color: result.isNeutral ? '#10b981' : '#f59e0b' }}>
            {result.isNeutral ? 'Carbon Neutral! Net surplus achieved.' : `Carbon Deficit — ${fmt(result.gap)} kg CO₂e gap this ${periodLabel}`}
          </strong>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            {result.isNeutral
              ? `You offset ${fmt(result.surplusOrGap)} kg CO₂e more than emitted this ${periodLabel}. Eligible for carbon credits!`
              : `Your sinks cover ${fmt(result.coveragePct, 1)}% of emissions. Plant ${fmt(result.treesNeeded)} more trees or add ${fmt(result.hectaresNeeded, 1)} hectares to achieve neutrality.`
            }
          </p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <StatCard
          title={<><FaFire /> Emissions ({periodLabel})</>}
          value={fmt(result.scaledEmissions)}
          unit="kg CO₂e"
          color="#ef4444"
          sub={`Daily rate × ${period === 'monthly' ? 30 : period === 'yearly' ? 365 : 1} days`}
        />
        <StatCard
          title={<><FaTree /> Total Sink ({periodLabel})</>}
          value={fmt(result.totalSink)}
          unit="kg CO₂"
          color="#10b981"
          sub={`Trees: ${fmt(result.treeSink)} kg + Area: ${fmt(result.hectareSink)} kg`}
        />
        <StatCard
          title={<><FaBalanceScale /> Carbon Gap ({periodLabel})</>}
          value={result.isNeutral ? '0' : fmt(result.gap)}
          unit="kg CO₂e"
          color={result.isNeutral ? '#10b981' : '#f59e0b'}
          sub={result.isNeutral ? 'Neutral!' : `${fmt(result.treesNeeded)} trees OR ${fmt(result.hectaresNeeded, 1)} ha needed`}
        />
        <StatCard
          title={<><FaCoins /> Credits Earned</>}
          value={fmt(result.creditsEarned, 2)}
          unit="credits"
          color="#8b5cf6"
          sub={result.isNeutral ? `1 credit = 1 tonne CO₂e offset` : 'Earn credits by closing the gap'}
        />
      </div>

      {result.isNeutral && (
        <div className="responsive-grid-2" style={{ marginBottom: '2rem' }}>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.03))', border: '1px solid #8b5cf6' }}>
            <div className="kpi-title">💵 Market Value (USD)</div>
            <div className="kpi-value" style={{ color: '#8b5cf6', fontSize: '2rem' }}>
              {fmtCurr(result.marketValueUSD, '$')}
            </div>
            <div className="kpi-trend">{fmt(result.creditsEarned, 2)} credits × ${CREDIT_PRICE_USD}/credit</div>
          </div>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.03))', border: '1px solid #10b981' }}>
            <div className="kpi-title"><FaCoins /> Market Value (INR)</div>
            <div className="kpi-value" style={{ color: '#10b981', fontSize: '2rem' }}>
              {fmtCurr(result.marketValueINR, '₹')}
            </div>
            <div className="kpi-trend">@ ₹{USD_TO_INR}/$ exchange rate</div>
          </div>
        </div>
      )}

      <div className="responsive-grid-2-1" style={{ marginBottom: '2rem' }}>
        <div className="chart-card">
          <div className="chart-header">
            <h3><FaChartBar /> Emissions vs Sinks vs Gap</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All values in kg CO₂e for selected {periodLabel}</p>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tipStyle} formatter={v => [`${fmt(v)} kg CO₂e`]} />
                <Bar dataKey="value" name="kg CO₂e" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="chart-header" style={{ width: '100%' }}>
            <h3>🎯 Sink Coverage</h3>
          </div>
          <div style={{ height: 220, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="55%"
                innerRadius="60%" outerRadius="90%"
                barSize={18}
                data={radialData}
                startAngle={90} endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  background={{ fill: 'rgba(255,255,255,0.05)' }}
                  dataKey="value"
                  angleAxisId={0}
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -40%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: result.isNeutral ? '#10b981' : '#f59e0b' }}>
                {fmt(result.coveragePct, 1)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>covered</div>
            </div>
          </div>
        </div>
      </div>

      {!result.isNeutral && (
        <div className="chart-card">
          <div className="chart-header">
            <h3>🗺️ Path to Carbon Neutrality</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Options to close the {fmt(result.gap)} kg CO₂e gap this {periodLabel}
            </p>
          </div>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['Strategy', 'Quantity Required', 'Impact (kg CO₂e)'].map(h => (
                  <th key={h} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.85rem' }}><FaTree /> Plant Trees</td>
                <td style={{ padding: '0.85rem', color: '#10b981', fontWeight: 600 }}>{fmt(result.treesNeeded)} trees</td>
                <td style={{ padding: '0.85rem' }}>-{fmt(result.gap)} kg/yr</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.85rem' }}><FaSeedling /> Expand Forest Area</td>
                <td style={{ padding: '0.85rem', color: '#3b82f6', fontWeight: 600 }}>{fmt(result.hectaresNeeded, 2)} hectares</td>
                <td style={{ padding: '0.85rem' }}>-{fmt(result.gap)} kg/yr</td>
              </tr>
              <tr>
                <td style={{ padding: '0.85rem' }}><FaCoins /> Buy Carbon Credits</td>
                <td style={{ padding: '0.85rem', color: '#8b5cf6', fontWeight: 600 }}>
                  {fmt(result.gap / CARBON_CREDIT_TONNE, 2)} credits
                </td>
                <td style={{ padding: '0.85rem' }}>
                  ₹{fmt((result.gap / CARBON_CREDIT_TONNE) * CREDIT_PRICE_USD * USD_TO_INR)} est. cost
                </td>
              </tr>
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
