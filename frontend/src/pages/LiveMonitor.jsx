import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { AlertTriangle, Satellite, Crosshair, ShieldAlert, Activity } from 'lucide-react'

export default function LiveMonitor() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState("NORMAL")

  useEffect(() => {
    // 1. Fetch History
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('risk_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (!error) setAlerts(data)
      setLoading(false)
    }

    fetchHistory()

    // 2. Realtime Subscription
    const channel = supabase
      .channel('risk_events_live')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'risk_events' }, 
        (payload) => {
          const newAlert = payload.new
          // Trigger a "System Flash" if high risk
          if (newAlert.probability > 80) {
             setSystemStatus("CRITICAL")
             setTimeout(() => setSystemStatus("NORMAL"), 3000)
          }
          setAlerts((prev) => [newAlert, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Helper to determine color based on risk
  const getRiskColor = (prob) => {
    if (prob >= 80) return "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-red-950/20 text-red-400"
    if (prob >= 50) return "border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)] bg-orange-950/20 text-orange-400"
    return "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] bg-blue-950/20 text-blue-400"
  }

  return (
    <div className="min-h-screen bg-[#050505] text-green-500 font-mono relative overflow-hidden selection:bg-green-500 selection:text-black">
      
      {/* 1. CRT Scanline Overlay Effect */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>

      {/* 2. Header / HUD */}
      <div className={`p-6 border-b border-white/10 flex justify-between items-center transition-colors duration-500 ${systemStatus === 'CRITICAL' ? 'bg-red-900/20' : 'bg-black'}`}>
        <div>
          <h1 className="text-3xl font-black tracking-[0.2em] text-white flex items-center gap-3">
            <Activity className={systemStatus === 'CRITICAL' ? "animate-bounce text-red-500" : "text-green-500"} />
            ASRIDE <span className="text-xs font-normal opacity-50 tracking-normal self-end mb-1">v2.0.4</span>
          </h1>
          <div className="flex gap-4 mt-2 text-xs text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> 
              Live Feed
            </span>
            <span>Lat: {loading ? '---' : '12.44°N'}</span>
            <span>Lon: {loading ? '---' : '78.22°E'}</span>
          </div>
        </div>

        {/* Big Alert Status Box */}
        <div className={`px-6 py-2 border rounded-sm font-bold tracking-widest ${systemStatus === 'CRITICAL' ? 'border-red-500 text-red-500 animate-pulse' : 'border-green-800 text-green-700'}`}>
          STATUS: {systemStatus}
        </div>
      </div>

      {/* 3. The Feed Grid */}
      <div className="max-w-7xl mx-auto p-6 grid gap-4 relative z-10">
        
        {loading && (
            <div className="text-center py-20 text-green-500 animate-pulse">
                INITIALIZING ORBITAL CALCULATIONS...
            </div>
        )}

        {/* Column Headers */}
        {!loading && (
            <div className="grid grid-cols-12 text-xs text-gray-500 uppercase tracking-widest px-4 mb-2">
                <div className="col-span-4">Asset / Threat</div>
                <div className="col-span-2 text-center">Miss Dist</div>
                <div className="col-span-2 text-center">Impact In</div>
                <div className="col-span-3 text-right">Risk Prob</div>
                <div className="col-span-1"></div>
            </div>
        )}

        {/* 4. The Alert Cards */}
        {alerts.map((alert, index) => (
          <div 
            key={alert.id} 
            className={`
                grid grid-cols-12 items-center p-4 border-l-4 rounded-r-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:bg-white/5
                ${getRiskColor(alert.probability)}
                ${index === 0 ? 'animate-[slideIn_0.5s_ease-out]' : ''}
            `}
          >
            {/* Column 1: Names */}
            <div className="col-span-4">
                <div className="flex items-center gap-3 text-white font-bold text-lg">
                    <Satellite className="w-5 h-5 opacity-70" />
                    {alert.primary_asset}
                </div>
                <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                    <Crosshair className="w-3 h-3" />
                    TARGET: {alert.secondary_asset}
                </div>
            </div>

            {/* Column 2: Distance */}
            <div className="col-span-2 text-center font-mono text-xl">
                {alert.miss_distance.toFixed(3)} <span className="text-xs opacity-50">km</span>
            </div>

            {/* Column 3: Time */}
            <div className="col-span-2 text-center font-mono text-white/80">
                T-{alert.time_to_impact}s
            </div>

            {/* Column 4: Risk Bar */}
            <div className="col-span-3 text-right flex flex-col items-end justify-center">
                <span className="text-2xl font-black">{alert.probability}%</span>
                {/* Visual Progress Bar */}
                <div className="w-full h-1 bg-gray-800 rounded mt-1 overflow-hidden">
                    <div 
                        className={`h-full ${alert.probability > 80 ? 'bg-red-500' : 'bg-blue-500'}`} 
                        style={{ width: `${alert.probability}%` }}
                    ></div>
                </div>
            </div>

            {/* Column 5: Icon */}
            <div className="col-span-1 flex justify-end">
                {alert.probability > 80 && <ShieldAlert className="w-6 h-6 animate-pulse" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}