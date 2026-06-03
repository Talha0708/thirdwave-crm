import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Mail, 
  ExternalLink, 
  ShieldAlert 
} from 'lucide-react';

const ManageClients = () => {
  // ডামি ক্লায়েন্ট ডেটা
  const [clients] = useState([
    { id: 'CLI-092', name: 'Aurelian Menswear', email: 'admin@aurelian.com', plan: 'Enterprise', status: 'Active', joined: '12 May, 2026', mrr: '৳ 15,000' },
    { id: 'CLI-091', name: 'Urban Fit BD', email: 'contact@urbanfit.bd', plan: 'Pro', status: 'Active', joined: '08 May, 2026', mrr: '৳ 8,000' },
    { id: 'CLI-090', name: 'Style Echo', email: 'hello@styleecho.com', plan: 'Basic', status: 'Onboarding', joined: '01 May, 2026', mrr: '৳ 4,000' },
    { id: 'CLI-089', name: 'Luxe Attire', email: 'sales@luxeattire.com', plan: 'Pro', status: 'Suspended', joined: '15 Apr, 2026', mrr: '৳ 8,000' },
    { id: 'CLI-088', name: 'Denim Core', email: 'info@denimcore.bd', plan: 'Enterprise', status: 'Active', joined: '10 Apr, 2026', mrr: '৳ 15,000' },
  ]);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-500" /> Manage Workspaces
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Add, edit, or suspend client accounts across the CRM.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/20">
          <UserPlus className="w-4 h-4" /> Add New Client
        </button>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search clients by name, ID or email..." 
            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 text-zinc-300 text-sm rounded-xl focus:outline-none focus:border-zinc-600 appearance-none min-w-[120px]">
            <option value="all">All Plans</option>
            <option value="enterprise">Enterprise</option>
            <option value="pro">Pro</option>
            <option value="basic">Basic</option>
          </select>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors shrink-0">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Clients Table ─── */}
      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-[#111111] text-zinc-500 font-medium border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4">Workspace / Email</th>
                <th className="px-6 py-4">Plan & MRR</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-900/50 transition-colors group">
                  
                  {/* Client Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-white border border-zinc-700 shrink-0">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-200">{client.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                          <Mail className="w-3 h-3" /> {client.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Plan & MRR */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex w-max px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {client.plan}
                      </span>
                      <span className="text-zinc-400 font-medium text-xs">{client.mrr} / mo</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 text-zinc-400">
                    {client.joined}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      client.status === 'Active' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 
                      client.status === 'Onboarding' ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' : 
                      'text-red-400 bg-red-400/10 border border-red-400/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        client.status === 'Active' ? 'bg-emerald-400' : 
                        client.status === 'Onboarding' ? 'bg-amber-400' : 
                        'bg-red-400'
                      }`}></span>
                      {client.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button title="Login as Client" className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded-md transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button title="Edit Client" className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-md transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      {client.status !== 'Suspended' ? (
                        <button title="Suspend Account" className="p-1.5 text-amber-500/70 hover:text-amber-500 bg-amber-950/30 rounded-md transition-colors">
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      ) : (
                        <button title="Delete Permanently" className="p-1.5 text-red-500/70 hover:text-red-500 bg-red-950/30 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default ManageClients;