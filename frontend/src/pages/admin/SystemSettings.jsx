import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Key, 
  Globe, 
  Shield, 
  Database, 
  BellRing, 
  Webhook,
  Copy,
  CheckCircle2
} from 'lucide-react';

const SystemSettings = () => {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // ডামি এপিআই কি
  const masterApiKey = "tw_live_98x7a6sd5f4g3h2j1k_premium";

  const handleCopy = () => {
    navigator.clipboard.writeText(masterApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7 text-zinc-400" /> System Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage global configurations, API keys, and security for Thirdwave CRM.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── Main Settings (Left Side - 2 Cols) ─── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Information */}
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/50 pb-4">
              <Globe className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-medium text-white">Global Workspace Details</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Company Name</label>
                <input 
                  type="text" 
                  defaultValue="Thirdwave Future Tech" 
                  className="w-full px-4 py-2.5 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Support Email</label>
                <input 
                  type="email" 
                  defaultValue="talhabelal10@gmail.com" 
                  className="w-full px-4 py-2.5 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-zinc-400">Emergency Contact Number</label>
                <input 
                  type="text" 
                  defaultValue="01987573397" 
                  className="w-full px-4 py-2.5 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* API & Webhooks */}
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/50 pb-4">
              <Webhook className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-medium text-white">Master API & Meta Integrations</h2>
            </div>

            <div className="space-y-6">
              {/* Master API Key */}
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-2 block">System Master API Key (DO NOT SHARE)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="password" 
                    value={masterApiKey} 
                    readOnly
                    className="w-full px-4 py-2.5 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-500 font-mono focus:outline-none"
                  />
                  <button 
                    onClick={handleCopy}
                    className="p-2.5 bg-[#111111] border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400 rounded-xl transition-colors flex-shrink-0"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Meta Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Meta App ID</label>
                  <input 
                    type="text" 
                    placeholder="Enter Meta App ID" 
                    className="w-full px-4 py-2.5 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">App Secret</label>
                  <input 
                    type="password" 
                    placeholder="••••••••••••••••" 
                    className="w-full px-4 py-2.5 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── System Controls (Right Side - 1 Col) ─── */}
        <div className="space-y-6">
          
          {/* Security */}
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-medium text-white">Security Controls</h2>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Require 2FA</h3>
                  <p className="text-xs text-zinc-500 mt-1">Force 2FA for all admin accounts.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Maintenance Mode</h3>
                  <p className="text-xs text-zinc-500 mt-1">Lock out clients during updates.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Database Actions */}
          <div className="bg-[#0A0A0A] border border-red-900/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-medium text-red-500">Danger Zone</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Proceed with extreme caution. These actions are irreversible and affect all client data.
            </p>
            <button className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 text-sm font-medium rounded-xl transition-colors">
              Clear AI Cache Logs
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SystemSettings;