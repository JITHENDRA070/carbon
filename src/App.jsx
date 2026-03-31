import React, { useState, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { calculateEmissions, calculateSinks, calculateGapAnalysis } from './utils/carbonLogic';
import { supabase } from './lib/supabase';
import MiningDashboard from './components/MiningDashboard';
import CarbonSinkModule from './components/CarbonSinkModule';
import MineAuthGate from './components/MineAuthGate';
import Navbar from './components/Navbar';
import { FaLeaf, FaChartBar, FaSeedling, FaGlobe, FaRegEdit, FaSlidersH, FaCoins, FaFire, FaUsers, FaTree, FaBalanceScale, FaTrophy, FaExclamationTriangle, FaIndustry, FaRecycle, FaChartLine, FaGasPump, FaBolt, FaWind, FaBomb } from "react-icons/fa";

const MOCK_HISTORICAL_DATA = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const diesel = 1000 + Math.random() * 200;
  const petrol = 500 + Math.random() * 100;
  const electricity = 5000 + Math.random() * 1000;
  const methane = 100 + Math.random() * 50;
  const explosives = 200 + Math.random() * 50;

  const emissions = calculateEmissions({
    dieselLiters: diesel,
    petrolLiters: petrol,
    electricityKwh: electricity,
    methaneKg: methane,
    explosivesKg: explosives,
    workersCount: 150
  });

  const sinks = calculateSinks({ treesPlanted: 5000, areaHectares: 120 });

  return {
    name: `Day ${day}`,
    Emissions: Math.round(emissions.totalEmissions),
    Sinks: Math.round(sinks),
    Gap: Math.round(emissions.totalEmissions - sinks)
  };
});

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CarbonDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [isSaving, setIsSaving] = useState(false);
  const [upsertModal, setUpsertModal] = useState(null);
  const [formData, setFormData] = useState({
    workers: 150,
    dieselLiters: 1200,
    petrolLiters: 450,
    methaneKg: 150,
    electricityKwh: 6000,
    explosivesKg: 250,
    workersCount: 150
  });

  const [sinkData, setSinkData] = useState({
    treesPlanted: 5000,
    areaHectares: 120
  });
  const [simMultipliers, setSimMultipliers] = useState({
    diesel: 1,
    electricity: 1,
    methaneCapture: 0,
    newTrees: 0
  });
  const [creditPriceInr, setCreditPriceInr] = useState(850);
  const [creditPriceUsd, setCreditPriceUsd] = useState(10);
  const [selectedMarket, setSelectedMarket] = useState('vcm');
  const currentEmissions = useMemo(() => {
    return calculateEmissions({
      ...formData,
      dieselLiters: formData.dieselLiters * simMultipliers.diesel,
      electricityKwh: formData.electricityKwh * simMultipliers.electricity,
      methaneKg: formData.methaneKg * (1 - simMultipliers.methaneCapture)
    });
  }, [formData, simMultipliers]);

  const currentSinks = useMemo(() => {
    return calculateSinks({
      treesPlanted: sinkData.treesPlanted + simMultipliers.newTrees,
      areaHectares: sinkData.areaHectares
    });
  }, [sinkData, simMultipliers]);

  const gapAnalysis = calculateGapAnalysis(currentEmissions.totalEmissions, currentSinks);

  const pieData = [
    { name: 'Diesel', value: currentEmissions.breakdown.diesel },
    { name: 'Petrol', value: currentEmissions.breakdown.petrol },
    { name: 'Electricity', value: currentEmissions.breakdown.electricity },
    { name: 'Methane', value: currentEmissions.breakdown.methane },
    { name: 'Explosives', value: currentEmissions.breakdown.explosives }
  ].filter(d => d.value > 0);

  const formatNumber = (num) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (parseFloat(value) || 0)
    }));
  };
  const buildMiningRecord = (mineId) => ({
    mineid: mineId,
    workers: formData.workers,
    diesel: formData.dieselLiters,
    petrol: formData.petrolLiters,
    electricity: formData.electricityKwh,
    explosives: formData.explosivesKg,
    methane: formData.methaneKg,
  });

  const today = new Date().toISOString().split('T')[0];
  const checkExistingRecord = async (mineId) => {
    const { data, error } = await supabase
      .from('mining')
      .select('mineid, created_at')
      .eq('mineid', mineId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const handleSaveLog = async (mineId) => {
    try {
      setIsSaving(true);
      const existing = await checkExistingRecord(mineId);
      if (existing) {
        setUpsertModal({ existingRecord: existing, newData: buildMiningRecord(mineId), mineId });
      } else {
        const { error } = await supabase
          .from('mining')
          .insert(buildMiningRecord(mineId));
        if (error) throw error;
        alert(` Log saved to mining table!\nMine: ${mineId}\nTime: ${new Date().toISOString()}`);
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('[mining] INSERT error:', err);
      alert(` Error saving log: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmUpdate = async () => {
    try {
      setIsSaving(true);
      const mineId = upsertModal?.mineId
      if (!mineId) throw new Error('Missing mine id for update.')
      const { error } = await supabase
        .from('mining')
        .update(buildMiningRecord(mineId))
        .eq('mineid', mineId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);
      if (error) throw error;
      setUpsertModal(null);
      alert(` Record updated in mining table!\nMine: ${mineId}`);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('[mining] UPDATE error:', err);
      alert(` Error updating record: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const SidebarItem = ({ id, label, icon }) => (
    <div
      className={`nav-link ${activeTab === id ? 'active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      <span style={{ fontSize: '1.2rem' }}>{icon}</span> {label}
    </div>
  );

  return (
    <MineAuthGate>
      {({ mineId }) => (
        <>
        <Navbar />
        <div className="dashboard-container">
      
      <aside className="sidebar">
        <div className="brand">
          <span style={{ fontSize: '2rem' }}><FaLeaf /></span> IndianCoal™ Zero
        </div>
        <nav className="nav-links">
          <SidebarItem id="analytics" label="Emissions Analytics" icon={<FaChartBar />} />
          <SidebarItem id="sink" label="Carbon Sink & Gap" icon={<FaSeedling />} />
          <SidebarItem id="overview" label="Overview" icon={<FaGlobe />} />
          <SidebarItem id="data-entry" label="Daily Data Logs" icon={<FaRegEdit />} />
          <SidebarItem id="simulation" label="Simulation & Strategies" icon={<FaSlidersH />} />
          <SidebarItem id="credits" label="Carbon Credits Market" icon={<FaCoins />} />
        </nav>
      </aside>

      
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Carbon Neutrality Command Center</h1>
            <p style={{ color: 'var(--text-muted)' }}>Real-time emission vitals and offset tracking.</p>
          </div>
          <div className="header-actions">
            <button className="btn-outline">Export Report</button>
            <button className="btn-primary" onClick={() => setActiveTab('data-entry')}>+ New Log</button>
          </div>
        </header>

        
        {activeTab === 'analytics' && (
          <div className="fade-in">
            <MiningDashboard mineId={mineId} />
          </div>
        )}

        
        {activeTab === 'sink' && (
          <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
              <h2><FaSeedling /> Carbon Sink & Gap Analysis</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Estimate CO₂ absorption from plantations, calculate your carbon gap, and see credits earned.
              </p>
            </div>
            <CarbonSinkModule />
          </div>
        )}

        
        {activeTab === 'overview' && (
          <div className="fade-in">
            
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-title"><FaFire /> Total Daily Emissions</div>
                <div className="kpi-value" style={{ color: 'var(--accent-red)' }}>
                  {formatNumber(currentEmissions.totalEmissions)} <span style={{ fontSize: '1rem' }}>kg CO₂e</span>
                </div>
                <div className="kpi-trend trend-down">▼ 2.4% vs last week</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-title"><FaUsers /> Per Capita Emission</div>
                <div className="kpi-value">
                  {formatNumber(currentEmissions.perCapita)} <span style={{ fontSize: '1rem' }}>kg/worker</span>
                </div>
                <div className="kpi-trend trend-down">▼ 0.8% vs last week</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-title"><FaTree /> Total Carbon Sinks</div>
                <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>
                  {formatNumber(currentSinks)} <span style={{ fontSize: '1rem' }}>kg CO₂/day</span>
                </div>
                <div className="kpi-trend trend-up">▲ 500 trees planted recently</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-title">{gapAnalysis.gap > 0 ? <><FaBalanceScale /> Carbon Gap</> : <><FaTrophy /> Carbon Credits</>}</div>
                <div className="kpi-value" style={{ color: gapAnalysis.gap > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                  {gapAnalysis.gap > 0 ? formatNumber(gapAnalysis.gap) : formatNumber(gapAnalysis.creditsEarned)}
                  <span style={{ fontSize: '1rem' }}>{gapAnalysis.gap > 0 ? ' kg to offset' : ' credits'}</span>
                </div>
                <div className="kpi-trend">Action required to reach 0 gap</div>
              </div>
            </div>

            
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Emission vs Sink Trend (30 Days)</h3>
                </div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_HISTORICAL_DATA}>
                      <defs>
                        <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSinks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="Emissions" stroke="#ef4444" fillOpacity={1} fill="url(#colorEmissions)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Sinks" stroke="#10b981" fillOpacity={1} fill="url(#colorSinks)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>Emission Sources Breakdown</h3>
                </div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(val) => `${formatNumber(val)} kg`} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(16, 185, 129, 0.1))' }}>
              <h3>Path to Neutrality</h3>
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                You currently have a gap of <strong>{formatNumber(gapAnalysis.gap)} kg CO₂e</strong> per day.
                To offset this completely, you would need to either plant <strong>{formatNumber(gapAnalysis.gap / 21 * 365)}</strong> more trees
                or reduce diesel consumption by <strong>{formatNumber(gapAnalysis.gap / 2.68)}</strong> liters daily.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'data-entry' && (
          <div className="data-entry-module fade-in">
            <h2>Submit Daily Log</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Logged in as mine <strong>{mineId}</strong>. Your entry will be saved against this mine automatically.
            </p>

            <div className="form-grid">
              <div className="form-group">
                <label>Number of Workers</label>
                <input type="number" name="workers" value={formData.workers} onChange={handleInputChange} min="0" />
              </div>
              <div className="form-group">
                <label>Diesel Consumed (Liters)</label>
                <input type="number" name="dieselLiters" value={formData.dieselLiters} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Petrol Consumed (Liters)</label>
                <input type="number" name="petrolLiters" value={formData.petrolLiters} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Grid Electricity (kWh)</label>
                <input type="number" name="electricityKwh" value={formData.electricityKwh} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Methane Emitted (kg)</label>
                <input type="number" name="methaneKg" value={formData.methaneKg} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Explosives Used (kg)</label>
                <input type="number" name="explosivesKg" value={formData.explosivesKg} onChange={handleInputChange} />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => handleSaveLog(mineId)}
              disabled={isSaving}
              style={{ opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
            >
              {isSaving ? ' Saving…' : 'Save Log to Database'}
            </button>

            
            {upsertModal && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
              }}>
                <div style={{
                  background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-light)', borderRadius: '16px',
                  padding: '2rem', maxWidth: '480px', width: '90%',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></div>
                  <h3 style={{ marginBottom: '0.75rem' }}>Duplicate Record Detected</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    A log for Mine ID <strong style={{ color: 'var(--accent-orange)' }}>"{upsertModal.existingRecord.mineid}"</strong> already
                    exists for today (<strong>{upsertModal.existingRecord.created_at?.split('T')[0]}</strong>).
                    Would you like to <strong>update</strong> the existing record with the new values, or cancel?
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={handleConfirmUpdate} disabled={isSaving} style={{ opacity: isSaving ? 0.7 : 1 }}>
                      {isSaving ? ' Updating…' : 'Update Existing Record'}
                    </button>
                    <button className="btn-outline" onClick={() => setUpsertModal(null)} disabled={isSaving}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="data-entry-module fade-in">
            <h2>Strategy Simulator</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Adjust operational targets to see real-time impact on carbon gap.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
              <div>
                <div className="slider-container">
                  <label>
                    <span>Diesel Usage Factor</span>
                    <span style={{ color: 'var(--accent-green)' }}>{Math.round(simMultipliers.diesel * 100)}%</span>
                  </label>
                  <input type="range" min="0" max="1.5" step="0.05" value={simMultipliers.diesel}
                    onChange={e => setSimMultipliers(prev => ({ ...prev, diesel: parseFloat(e.target.value) }))} />
                </div>

                <div className="slider-container">
                  <label>
                    <span>Grid Electricity usage</span>
                    <span style={{ color: 'var(--accent-blue)' }}>{Math.round(simMultipliers.electricity * 100)}%</span>
                  </label>
                  <input type="range" min="0" max="1.5" step="0.05" value={simMultipliers.electricity}
                    onChange={e => setSimMultipliers(prev => ({ ...prev, electricity: parseFloat(e.target.value) }))} />
                </div>

                <div className="slider-container">
                  <label>
                    <span>Methane Capture Tech Pipeline</span>
                    <span style={{ color: 'var(--accent-orange)' }}>{Math.round(simMultipliers.methaneCapture * 100)}% Captured</span>
                  </label>
                  <input type="range" min="0" max="1" step="0.05" value={simMultipliers.methaneCapture}
                    onChange={e => setSimMultipliers(prev => ({ ...prev, methaneCapture: parseFloat(e.target.value) }))} />
                </div>

                <div className="slider-container">
                  <label>
                    <span>New Trees Plantation Drive</span>
                    <span style={{ color: 'var(--accent-green)' }}>+{simMultipliers.newTrees} Trees</span>
                  </label>
                  <input type="range" min="0" max="50000" step="1000" value={simMultipliers.newTrees}
                    onChange={e => setSimMultipliers(prev => ({ ...prev, newTrees: parseInt(e.target.value) }))} />
                </div>
              </div>

              <div className="kpi-card" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Simulated Carbon Gap</h3>
                <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: gapAnalysis.gap > 0 ? 'var(--accent-orange)' : 'var(--accent-green)', marginBottom: '1rem' }}>
                  {gapAnalysis.gap > 0 ? formatNumber(gapAnalysis.gap) : '0'} <span style={{ fontSize: '1.5rem' }}>kg CO₂e</span>
                </div>
                {gapAnalysis.gap <= 0 && (
                  <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                     Net Zero Achieved! <FaCoins /> {formatNumber(gapAnalysis.creditsEarned)} Credits Earned!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        
        {activeTab === 'credits' && (() => {
          const INR_USD = 0.012;
          const totalEmKg  = currentEmissions.totalEmissions;
          const totalEmTco = totalEmKg / 1000;
          const totalSinksTco = currentSinks / 1000;
          const netGapTco  = totalEmTco - totalSinksTco;
          const annualEmTco  = totalEmTco  * 365;
          const annualSinkTco = totalSinksTco * 365;
          const annualNetGap  = netGapTco * 365;
          const creditsEarned = annualNetGap < 0 ? Math.abs(annualNetGap) : 0;
          const creditsNeeded = annualNetGap > 0 ? annualNetGap : 0;
          const creditValueInr = creditsEarned * creditPriceInr;
          const creditValueUsd = creditsEarned * creditPriceUsd;
          const offsetCostInr  = creditsNeeded * creditPriceInr;
          const offsetCostUsd  = creditsNeeded * creditPriceUsd;
          const isNetPositive  = annualNetGap <= 0;
          const reductionPct = annualEmTco > 0
            ? Math.min(100, (annualSinkTco / annualEmTco) * 100).toFixed(1)
            : '0.0';
          const markets = [
            { key: 'vcm',        label: 'Voluntary Carbon Market',   priceInr: 850,  priceUsd: 10,  color: '#10b981', icon: <FaSeedling /> },
            { key: 'compliance', label: 'Compliance / Cap-and-Trade', priceInr: 2125, priceUsd: 25,  color: '#3b82f6', icon: <FaBalanceScale /> },
            { key: 'premium',    label: 'Premium Quality Credits',   priceInr: 5100, priceUsd: 60,  color: '#f59e0b', icon: <FaTrophy /> },
          ];

          const handleMarketSelect = (mkt) => {
            setSelectedMarket(mkt.key);
            setCreditPriceInr(mkt.priceInr);
            setCreditPriceUsd(mkt.priceUsd);
          };

          return (
            <div className="credits-market fade-in">
              
              <div className="credits-header">
                <div>
                  <h2 className="credits-title"><FaCoins /> Carbon Credit Market</h2>
                  <p className="credits-subtitle">
                    Real-time valuation of your mine's carbon position based on daily activity data.
                  </p>
                </div>
                <div className={`credits-status-badge ${isNetPositive ? 'credits-status-badge--earn' : 'credits-status-badge--buy'}`}>
                  {isNetPositive ? ' Credit Earner' : ' Offset Buyer'}
                </div>
              </div>

              
              <div className="credits-market-tabs">
                {markets.map(mkt => (
                  <button
                    key={mkt.key}
                    className={`credits-mkt-btn ${selectedMarket === mkt.key ? 'credits-mkt-btn--active' : ''}`}
                    style={selectedMarket === mkt.key ? { borderColor: mkt.color, boxShadow: `0 0 0 3px ${mkt.color}33` } : {}}
                    onClick={() => handleMarketSelect(mkt)}
                  >
                    <span className="credits-mkt-icon">{mkt.icon}</span>
                    <span className="credits-mkt-label">{mkt.label}</span>
                    <span className="credits-mkt-price" style={{ color: mkt.color }}>
                      ₹{mkt.priceInr.toLocaleString('en-IN')}/t
                    </span>
                  </button>
                ))}
              </div>

              
              <div className="credits-kpi-grid">
                <div className="credits-kpi-card">
                  <div className="credits-kpi-icon"><FaIndustry /></div>
                  <div className="credits-kpi-label">Annual Emissions</div>
                  <div className="credits-kpi-value" style={{ color: '#ef4444' }}>
                    {annualEmTco.toFixed(2)}
                    <span className="credits-kpi-unit"> tCO₂e / yr</span>
                  </div>
                </div>
                <div className="credits-kpi-card">
                  <div className="credits-kpi-icon">🌳</div>
                  <div className="credits-kpi-label">Annual Sequestration</div>
                  <div className="credits-kpi-value" style={{ color: '#10b981' }}>
                    {annualSinkTco.toFixed(2)}
                    <span className="credits-kpi-unit"> tCO₂e / yr</span>
                  </div>
                </div>
                <div className="credits-kpi-card">
                  <div className="credits-kpi-icon"><FaBalanceScale /></div>
                  <div className="credits-kpi-label">Net Position (Annual)</div>
                  <div className="credits-kpi-value" style={{ color: isNetPositive ? '#10b981' : '#f59e0b' }}>
                    {isNetPositive ? '+' : '-'}{Math.abs(annualNetGap).toFixed(2)}
                    <span className="credits-kpi-unit"> tCO₂e</span>
                  </div>
                </div>
                <div className="credits-kpi-card">
                  <div className="credits-kpi-icon"><FaRecycle /></div>
                  <div className="credits-kpi-label">Offset Coverage</div>
                  <div className="credits-kpi-value" style={{ color: '#8b5cf6' }}>
                    {reductionPct}%
                    <span className="credits-kpi-unit"> sinks/emissions</span>
                  </div>
                </div>
              </div>

              
              <div className="credits-result-grid">
                {isNetPositive ? (
                  
                  <div className="credits-result-card credits-result-card--earn">
                    <div className="credits-result-glow credits-result-glow--earn" />
                    <div className="credits-result-top">
                      <span className="credits-result-emoji"><FaTrophy /></span>
                      <div>
                        <div className="credits-result-heading">Credits Available to Sell</div>
                        <div className="credits-result-sub">Your mine is net carbon-negative — congrats!</div>
                      </div>
                    </div>
                    <div className="credits-result-amount">
                      {creditsEarned.toFixed(3)}
                      <span className="credits-result-unit"> tCO₂e credits</span>
                    </div>
                    <div className="credits-result-divider" />
                    <div className="credits-result-valuation">
                      <div className="credits-val-row">
                        <span>Market value (INR)</span>
                        <strong style={{ color: '#10b981' }}>₹{creditValueInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                      </div>
                      <div className="credits-val-row">
                        <span>Market value (USD)</span>
                        <strong style={{ color: '#10b981' }}>${creditValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
                      </div>
                      <div className="credits-val-row">
                        <span>Price per tonne</span>
                        <strong>₹{creditPriceInr.toLocaleString('en-IN')} / ${creditPriceUsd}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  
                  <div className="credits-result-card credits-result-card--buy">
                    <div className="credits-result-glow credits-result-glow--buy" />
                    <div className="credits-result-top">
                      <span className="credits-result-emoji"><FaChartLine /></span>
                      <div>
                        <div className="credits-result-heading">Credits Needed to Offset</div>
                        <div className="credits-result-sub">Shortfall to reach carbon neutrality for the year</div>
                      </div>
                    </div>
                    <div className="credits-result-amount" style={{ color: '#f59e0b' }}>
                      {creditsNeeded.toFixed(3)}
                      <span className="credits-result-unit"> tCO₂e deficit</span>
                    </div>
                    <div className="credits-result-divider" />
                    <div className="credits-result-valuation">
                      <div className="credits-val-row">
                        <span>Offset cost (INR)</span>
                        <strong style={{ color: '#f59e0b' }}>₹{offsetCostInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                      </div>
                      <div className="credits-val-row">
                        <span>Offset cost (USD)</span>
                        <strong style={{ color: '#f59e0b' }}>${offsetCostUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
                      </div>
                      <div className="credits-val-row">
                        <span>Price per tonne</span>
                        <strong>₹{creditPriceInr.toLocaleString('en-IN')} / ${creditPriceUsd}</strong>
                      </div>
                    </div>
                  </div>
                )}

                
                <div className="credits-price-card">
                  <div className="credits-result-glow credits-result-glow--purple" />
                  <h3 className="credits-price-title"><FaSlidersH /> Custom Market Price</h3>
                  <p className="credits-price-hint">Override the price per tonne to model different market scenarios.</p>
                  <div className="credits-price-row">
                    <label htmlFor="credit-inr">Price (₹ / tCO₂e)</label>
                    <input
                      id="credit-inr"
                      type="number"
                      min="0"
                      value={creditPriceInr}
                      onChange={(e) => setCreditPriceInr(Number(e.target.value) || 0)}
                      className="credits-price-input"
                    />
                  </div>
                  <div className="credits-price-row">
                    <label htmlFor="credit-usd">Price ($ / tCO₂e)</label>
                    <input
                      id="credit-usd"
                      type="number"
                      min="0"
                      value={creditPriceUsd}
                      onChange={(e) => setCreditPriceUsd(Number(e.target.value) || 0)}
                      className="credits-price-input"
                    />
                  </div>
                  <div className="credits-price-divider" />
                  <div className="credits-price-summary">
                    <div className="credits-val-row">
                      <span>Scenario value (INR)</span>
                      <strong style={{ color: isNetPositive ? '#10b981' : '#f59e0b' }}>
                        {isNetPositive
                          ? `₹${(creditsEarned * creditPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                          : `-₹${(creditsNeeded  * creditPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                        }
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              
              <div className="credits-breakdown-card">
                <h3 className="credits-breakdown-title"><FaChartBar /> Emissions vs Sinks Breakdown (Daily → Annual)</h3>
                <div className="credits-breakdown-table">
                  <div className="cb-row cb-row--header">
                    <span>Source</span>
                    <span>Daily (tCO₂e)</span>
                    <span>Annual (tCO₂e)</span>
                    <span>Market Value</span>
                  </div>
                  {[
                    { label: <><FaFire /> Diesel</>, val: currentEmissions.breakdown.diesel / 1000 },
                    { label: <><FaGasPump /> Petrol</>, val: currentEmissions.breakdown.petrol / 1000 },
                    { label: <><FaBolt /> Electricity</>, val: currentEmissions.breakdown.electricity / 1000 },
                    { label: <><FaWind /> Methane</>, val: currentEmissions.breakdown.methane / 1000 },
                    { label: <><FaBomb /> Explosives</>, val: currentEmissions.breakdown.explosives / 1000 },
                  ].map(row => (
                    <div key={row.label} className="cb-row cb-row--emission">
                      <span>{row.label}</span>
                      <span>{row.val.toFixed(4)}</span>
                      <span>{(row.val * 365).toFixed(2)}</span>
                      <span style={{ color: '#ef4444' }}>
                        ₹{(row.val * 365 * creditPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                  <div className="cb-row cb-row--sink">
                    <span>🌳 Carbon Sinks</span>
                    <span style={{ color: '#10b981' }}>{totalSinksTco.toFixed(4)}</span>
                    <span style={{ color: '#10b981' }}>{annualSinkTco.toFixed(2)}</span>
                    <span style={{ color: '#10b981' }}>
                      -₹{(annualSinkTco * creditPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="cb-row cb-row--total">
                    <span><strong>Net Position</strong></span>
                    <span><strong style={{ color: isNetPositive ? '#10b981' : '#f59e0b' }}>{netGapTco.toFixed(4)}</strong></span>
                    <span><strong style={{ color: isNetPositive ? '#10b981' : '#f59e0b' }}>{annualNetGap.toFixed(2)}</strong></span>
                    <span><strong style={{ color: isNetPositive ? '#10b981' : '#f59e0b' }}>
                      {isNetPositive
                        ? `+₹${(creditsEarned * creditPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                        : `-₹${(creditsNeeded * creditPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                      }
                    </strong></span>
                  </div>
                </div>
              </div>

              
              <p className="credits-disclaimer">
                <FaExclamationTriangle /> Values are illustrative and based on daily activity inputs. Actual carbon credit valuations
                require third-party verification per VCS / Gold Standard / BEE India norms.
              </p>
            </div>
          );
        })()}

      </main>
    </div>
        </>
      )}
    </MineAuthGate>
  );
}
