import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, 
  MessageCircle, 
  TrendingUp, 
  ShoppingBag, 
  Bot, 
  Activity, 
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  // ডামি স্ট্যাটিস্টিকস
  const stats = [
    { label: 'Total Revenue', value: '৳ 45,230', trend: '+12.5%', isPositive: true, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
    { label: 'AI Conversations', value: '1,204', trend: '+22.4%', isPositive: true, icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { label: 'Conversion Rate', value: '8.4%', trend: '+1.2%', isPositive: true, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    { label: 'Pending Orders', value: '42', trend: '-4.1%', isPositive: false, icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' }
  ];

  // ডামি লাইভ এআই এক্টিভিটি
  const aiActivities = [
    { id: 1, text: 'AI closed a sale for Aurelian Premium Oxford Shirt.', time: '2 mins ago', type: 'sale' },
    { id: 2, text: 'AI answered a query about delivery charges in Dhaka.', time: '15 mins ago', type: 'query' },
    { id: 3, text: 'AI collected phone number from a potential lead.', time: '1 hour ago', type: 'lead' },
    { id: 4, text: 'AI handled an out-of-stock product inquiry smoothly.', time: '2 hours ago', type: 'query' },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* ─── Header Section ─── */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'Boss'}! 👋
        </h1>
        <p className="text-sm text-zinc-400 mt-2">Here is what's happening with your AI workforce today.</p>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[#0A0A0A] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
            {/* Background Glow Effect */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${stat.bg} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
            
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.border} border`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${stat.isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {stat.trend} <ArrowUpRight className="w-3 h-3 ml-1" />
              </span>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── AI Performance (Left Side - 2 Cols) ─── */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6 sm:p-8">
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

          {/* Custom CSS Progress Bars (No Third Party Libs) */}
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

        {/* ─── Live AI Activity Feed (Right Side - 1 Col) ─── */}
        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bot className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-white">Live Activity</h2>
          </div>
          
          <div className="relative border-l border-zinc-800/80 ml-3 space-y-6">
            {aiActivities.map((activity) => (
              <div key={activity.id} className="relative pl-6">
                {/* Indicator Dot */}
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