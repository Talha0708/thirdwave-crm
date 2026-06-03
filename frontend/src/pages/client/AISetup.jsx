import React, { useState } from 'react';
// ✅ Facebook এর বদলে MessageCircle ইম্পোর্ট করা হলো
import { Bot, Save, MessageSquare, Sliders, Webhook, Zap, MessageCircle, CheckCircle2 } from 'lucide-react';

const AISetup = () => {
  const [saving, setSaving] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    systemPrompt: "You are an expert sales assistant for THIRDWAVE-CRM. Always be polite, professional, and try to close the sale. Ask for the customer's phone number before confirming an order.",
    autoReply: true,
    tone: 'professional',
    delay: '0'
  });

  const handleSave = () => {
    setSaving(true);
    // Fake API Call delay
    setTimeout(() => {
      setSaving(false);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-500" /> AI Brain Setup
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Configure your AI assistant's personality, behavior, and integrations.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {saving ? <Zap className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving Config...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── Main Configuration (Left Side - 2 Cols) ─── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Persona & System Prompt */}
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-zinc-300" />
              <h2 className="text-lg font-medium text-white">System Prompt (Persona)</h2>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              This instruction dictates how the AI behaves. Be as specific as possible about your brand guidelines.
            </p>
            <textarea
              rows={6}
              value={aiConfig.systemPrompt}
              onChange={(e) => setAiConfig({...aiConfig, systemPrompt: e.target.value})}
              className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all custom-scrollbar leading-relaxed"
              placeholder="Tell your AI how to behave..."
            />
          </div>

          {/* Response Behavior */}
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sliders className="w-5 h-5 text-zinc-300" />
              <h2 className="text-lg font-medium text-white">Response Behavior</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Tone Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Conversational Tone</label>
                <select 
                  value={aiConfig.tone}
                  onChange={(e) => setAiConfig({...aiConfig, tone: e.target.value})}
                  className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none"
                >
                  <option value="professional">Professional & Corporate</option>
                  <option value="friendly">Friendly & Casual</option>
                  <option value="persuasive">Persuasive (Sales-focused)</option>
                  <option value="empathetic">Empathetic & Supportive</option>
                </select>
              </div>

              {/* Reply Delay */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Humanized Delay</label>
                <select 
                  value={aiConfig.delay}
                  onChange={(e) => setAiConfig({...aiConfig, delay: e.target.value})}
                  className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none"
                >
                  <option value="0">Instant (No delay)</option>
                  <option value="2">2 Seconds (Fast typing)</option>
                  <option value="5">5 Seconds (Natural typing)</option>
                </select>
              </div>
            </div>

            {/* Auto Reply Toggle */}
            <div className="mt-6 pt-6 border-t border-zinc-800/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Global Auto-Reply</h3>
                <p className="text-xs text-zinc-500 mt-1">If disabled, the AI will only draft responses for you to approve.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={aiConfig.autoReply}
                  onChange={() => setAiConfig({...aiConfig, autoReply: !aiConfig.autoReply})}
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* ─── Integrations (Right Side - 1 Col) ─── */}
        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Webhook className="w-5 h-5 text-zinc-300" />
              <h2 className="text-lg font-medium text-white">Active Channels</h2>
            </div>

            <div className="space-y-4">
              {/* Meta Integration */}
              <div className="p-4 border border-zinc-800 bg-[#111111] rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg">
                    {/* ✅ এখানে MessageCircle ব্যবহার করা হলো */}
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Meta Webhook</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4">Connected to THIRDWAVE-CRM Official Page.</p>
                <button className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                  Manage Connection &rarr;
                </button>
              </div>

              {/* Custom API */}
              <div className="p-4 border border-zinc-800 border-dashed bg-[#111111]/50 rounded-xl">
                <div className="flex flex-col items-center justify-center text-center py-2">
                  <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg mb-3">
                    <Webhook className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Add Custom Webhook</h3>
                  <p className="text-xs text-zinc-500 mb-3">Connect your own frontend or app.</p>
                  <button className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white rounded-lg transition-colors">
                    Generate API Key
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AISetup;