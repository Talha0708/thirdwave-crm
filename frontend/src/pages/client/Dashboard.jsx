import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  DollarSign, 
  MessageCircle, 
  TrendingUp, 
  Bot, 
  Activity, 
  ArrowUpRight,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Crown,
  Zap
} from 'lucide-react';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

  // ─── Backend থেকে ক্লায়েন্টের AI Config ও Limit ফেচ করা ───
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const reqConfig = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${API_URL}/ai-config`, reqConfig);
        
        if (response.data.success) {
          setConfig(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching AI config:", err);
        setError('Failed to sync with Thirdwave AI engines.');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDashboardData();
  }, [API_URL, token]);

  // সাবস্ক্রিপশন ক্যালকুলেশন
  const sub = config?.subscription || { plan: 'free', monthlyUsed: 0, monthlyLimit: 50, rpmLimit: 1 };
  const percentage = Math.min((sub.monthlyUsed / sub.monthlyLimit) * 100, 100).toFixed(1);
  const isNearLimit = percentage >= 80 && percentage < 100;
  const isLimitReached = percentage >= 100;

  // ফেসবুক কানেক্টেড আছে কি না চেক করা
  const isFbConnected = config?.integrations?.facebook?.isConnected;

  // ─── ডাইনামিক স্ট্যাটিস্টিকস ───
  const stats = [
    { 
        label: 'Monthly Limit', 
        value: `${sub.monthlyLimit}`, 
        trend: 'Messages', 
        isPositive: true, 
        icon: MessageCircle, 
        color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' 
    },
    { 
        label: 'Current Plan', 
        value: sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1), 
        trend: 'Active', 
        isPositive: true, 
        icon: TrendingUp, 
        color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' 
    },
    { 
        label: 'Meta Connection', 
        value: isFbConnected ? 'Linked' : 'Pending', 
        trend: 'System', 
        isPositive: isFbConnected, 
        icon: ShieldCheck, 
        color: isFbConnected ? 'text-blue-400' : 'text-amber-400', 
        bg: isFbConnected ? 'bg-blue-400/10' : 'bg-amber-400/10', 
        border: isFbConnected ? 'border-blue-400/20' : 'border-amber-400/20' 
    },
    { 
        label: 'Speed (RPM)', 
        value: `${sub.rpmLimit}/min`, 
        trend: 'Max Limit', 
        isPositive: true, 
        icon: Zap, 
        color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' 
    }
  ];

  // ডামি লাইভ এআই এক্টিভিটি
  const aiActivities = [
    { id: 1, text: 'AI closed a sale for Premium Outfit.', time: '2 mins ago', type: 'sale' },
    { id: 2, text: 'AI answered a query about delivery charges in Dhaka.', time: '15 mins ago', type: 'query' },
    { id: 3, text: 'AI collected phone number from a potential lead.', time: '1 hour ago', type: 'lead' },
    { id: 4, text: 'AI handled an out-of-stock product inquiry smoothly.', time: '2 hours ago', type: 'query' },
  ];

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-zinc-400 font-medium animate-pulse">Syncing your AI workspace...</p>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      
      {/* ─── Header Section ─── */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'Boss'}! 👋
        </h1>
        <p className="text-sm text-zinc-400 mt-2">Here is what's happening with your AI workforce today.</p>
      </div>

      {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
          </div>
      )}

      {/* 💥 NEW: Usage Analytics Card (Progress Bar) ─── */}
      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-8 group hover:border-zinc-700 transition-colors">
        <div className={`absolute -top-32 -right-32 w-96 h-96 blur-[100px] opacity-20 rounded-full pointer-events-none transition-all duration-700 ${isLimitReached ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Activity className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-white">AI Message Usage</h2>
            </div>
            <p className="text-sm text-zinc-400">Your automation limits for the current billing cycle.</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-[#111111] border border-zinc-800 rounded-xl">
            <Crown className={`w-4 h-4 ${sub.plan === 'enterprise' ? 'text-purple-500' : sub.plan === 'pro' ? 'text-emerald-500' : 'text-zinc-400'}`} />
            <span className="text-sm font-semibold text-white capitalize">{sub.plan} Plan</span>
          </div>
        </div>

        <div className="mb-6 relative z-10">
          <div className="flex justify-between items-end mb-3">
            <div>
              <span className="text-4xl font-extrabold text-white tracking-tight">{sub.monthlyUsed}</span>
              <span className="text-zinc-500 ml-2 font-medium">/ {sub.monthlyLimit} Messages</span>
            </div>
            <span className={`text-sm font-bold ${isLimitReached ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-emerald-500'}`}>
              {percentage}% Used
            </span>
          </div>
          
          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${isLimitReached ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : isNearLimit ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-zinc-800/50 pt-6 mt-2 relative z-10 gap-4">
          <div className="flex items-center gap-3">
            {isLimitReached ? (
              <>
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <p className="text-sm text-red-400 font-medium">Your limit is reached! AI auto-replies are currently paused.</p>
              </>
            ) : isNearLimit ? (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm text-yellow-400 font-medium">You are running low on messages. Upgrade soon!</p>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <p className="text-sm text-emerald-400 font-medium">System is running smoothly. AI is active.</p>
              </>
            )}
          </div>

          {(isNearLimit || isLimitReached) && (
            <button className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-all active:scale-95 shadow-lg whitespace-nowrap">
              Upgrade Limits
            </button>
          )}
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[#0A0A0A] border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${stat.bg} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
            
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.border} border`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${stat.isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {stat.trend} {stat.trend.includes('%') && <ArrowUpRight className="w-3 h-3 ml-1" />}
              </span>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── AI Performance & Live Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-zinc-800 rounded-3xl p-6 sm:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> AI Resolution Rate
              </h2>
              <p className="text-xs text-zinc-500 mt-1">How effectively your AI is handling customer messages.</p>
            </div>
            <button className="text-xs text-zinc-400 hover:text-white transition-colors border border-zinc-800 px-3 py-1.5 rounded-lg bg-[#111111]">
              Last 7 Days
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-300 font-medium">Successfully Resolved (No human needed)</span>
                <span className="text-white font-semibold">85%</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-300 font-medium">Transferred to Human (Complex queries)</span>
                <span className="text-white font-semibold">12%</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-300 font-medium">Unanswered / Failed</span>
                <span className="text-white font-semibold">3%</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '3%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bot className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-white">Live Activity</h2>
          </div>
          
          <div className="relative border-l border-zinc-800/80 ml-3 space-y-6">
            {aiActivities.map((activity) => (
              <div key={activity.id} className="relative pl-6">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-[#0A0A0A] ring-1 ring-zinc-700">
                  {activity.type === 'sale' && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse"></div>}
                </div>
                <p className="text-sm text-zinc-300 mb-1">{activity.text}</p>
                <p className="text-xs text-zinc-600">{activity.time}</p>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 py-2.5 bg-[#111111] border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 text-sm font-medium rounded-xl transition-colors">
            View All Logs
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;