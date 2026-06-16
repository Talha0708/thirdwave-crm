import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Bot, Save, MessageSquare, Sliders, Webhook, Zap, 
  MessageCircle, CheckCircle2, Loader2, Phone, Key, X 
} from 'lucide-react';

const AISetup = () => {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ─── Facebook SDK State ───
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const FACEBOOK_APP_ID = "1471776343955299"; 

  // ─── Main Config State ───
  const [aiConfig, setAiConfig] = useState({
    systemPrompt: "",
    autoReply: true,
    tone: 'professional',
    delay: '0',
    // 💥 NEW: BYOK API Key State
    clientApiKey: "", 
    useSystemApiKey: false, 
    integrations: {
      facebook: { isConnected: false, connectionMethod: 'none', pageId: '', pageName: '', accessToken: '' },
      whatsapp: { isConnected: false, connectionMethod: 'none', phoneNumberId: '', accessToken: '' }
    }
  });

  // ─── Modal States ───
  const [activeModal, setActiveModal] = useState(null);
  const [modalTab, setModalTab] = useState('auto');
  const [manualFormData, setManualFormData] = useState({ id: '', name: '', token: '' });
  const [integrationSaving, setIntegrationSaving] = useState(false);

  // 💥 State for Facebook Pages Dropdown
  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

  // ─── Load Facebook SDK ───
  useEffect(() => {
    if (window.FB) {
      setIsSdkLoaded(true);
      return;
    }
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
      setIsSdkLoaded(true);
    };

    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) { return; }
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // ─── 1. Fetch Config ───
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(`${API_URL}/ai-config`, config);
        if (data.success && data.data) {
          setAiConfig(prev => ({
            ...prev,
            ...data.data,
            // 💥 NEW: Fetch API keys from backend
            clientApiKey: data.data.clientApiKey || "",
            useSystemApiKey: data.data.useSystemApiKey || false,
            integrations: {
              ...prev.integrations,
              ...(data.data.integrations || {})
            }
          }));
        }
      } catch (error) {
        console.error("Error fetching AI config", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchConfig();
  }, [token]);

  // ─── 2. Save General Config ───
  const handleSave = async () => {
    setSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/ai-config`, aiConfig, config);
      alert('✅ AI Brain Configuration Saved!');
    } catch (error) {
      console.error("Error saving AI config", error);
      alert('⚠️ Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  // ─── 3. Facebook Auto Login (FORCE REREQUEST FIX) ───
  const handleFacebookAutoLogin = () => {
    if (!isSdkLoaded) {
      alert("Facebook SDK is still loading. Please wait a second.");
      return;
    }

    window.FB.login(function (response) {
      const processToken = async () => {
        if (response.authResponse) {
          const shortLivedToken = response.authResponse.accessToken;
          console.log("✅ Fresh Login Success! Fetching pages from backend...");
          
          try {
            setIntegrationSaving(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const { data } = await axios.post(`${API_URL}/ai-config/facebook-oauth`, { shortLivedToken }, config);
            
            if (data.success && data.pages) {
              setAvailablePages(data.pages);
              console.log("Pages state updated with:", data.pages);
            }
          } catch (error) {
            console.error("Token Exchange Error:", error);
            alert("⚠️ Failed to fetch Facebook Pages. Please try again.");
          } finally {
            setIntegrationSaving(false);
          }
        } else {
          console.log('❌ User cancelled login or did not fully authorize.');
        }
      };

      processToken();
    }, { 
      scope: 'pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata,business_management',
      auth_type: 'rerequest', 
      return_scopes: true
    });
  };

  // ─── 4. Save Selected Facebook Page ───
  const handleSelectPageAndSave = async () => {
    setIntegrationSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const selectedPage = availablePages[selectedPageIndex];

      const payload = {
        platform: 'facebook',
        data: {
          isConnected: true,
          connectionMethod: 'oauth',
          pageId: selectedPage.pageId,
          pageName: selectedPage.pageName,
          accessToken: selectedPage.accessToken
        }
      };

      const { data } = await axios.post(`${API_URL}/ai-config/integration`, payload, config);

      if (data.success) {
        setAiConfig(prev => ({
          ...prev,
          integrations: {
            ...prev.integrations,
            facebook: payload.data
          }
        }));
        alert("✅ Facebook Page Connected Successfully!");
        setActiveModal(null);
        setAvailablePages([]); 
      }
    } catch (error) {
      console.error("Save Page Error:", error);
      alert("⚠️ Failed to connect the selected page.");
    } finally {
      setIntegrationSaving(false);
    }
  };

  // ─── 5. Save Integration (Manual) ───
  const handleIntegrationSave = async (e) => {
    e.preventDefault();
    setIntegrationSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const payloadData = activeModal === 'facebook' 
        ? { isConnected: true, connectionMethod: 'manual', pageId: manualFormData.id, pageName: manualFormData.name, accessToken: manualFormData.token }
        : { isConnected: true, connectionMethod: 'manual', phoneNumberId: manualFormData.id, accessToken: manualFormData.token };

      const payload = {
        platform: activeModal,
        data: payloadData
      };

      const { data } = await axios.post(`${API_URL}/ai-config/integration`, payload, config);
      
      if (data.success) {
        setAiConfig(prev => ({
          ...prev,
          integrations: {
            ...prev.integrations,
            [activeModal]: payloadData
          }
        }));
        setActiveModal(null);
        setManualFormData({ id: '', name: '', token: '' });
      }
    } catch (error) {
      console.error("Integration Save Error:", error);
      alert(`⚠️ Failed to connect ${activeModal}`);
    } finally {
      setIntegrationSaving(false);
    }
  };

  const openIntegrationModal = (platform) => {
    setActiveModal(platform);
    setModalTab('auto');
    setAvailablePages([]); 
    const currentData = aiConfig.integrations[platform];
    setManualFormData({
      id: platform === 'facebook' ? currentData.pageId : currentData.phoneNumberId,
      name: currentData.pageName || '',
      token: currentData.accessToken || ''
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-zinc-500 text-sm">Loading AI Brain...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10 animate-in fade-in duration-500 relative">
      
      {/* ─── INTEGRATION MODAL ─── */}
      {activeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-[#0A0A0A]">
              <div className="flex items-center gap-2">
                {activeModal === 'facebook' ? <MessageCircle className="w-5 h-5 text-blue-500" /> : <Phone className="w-5 h-5 text-emerald-500" />}
                <h2 className="text-lg font-semibold text-white capitalize">Connect {activeModal}</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex border-b border-zinc-800 bg-[#111111]">
              <button onClick={() => setModalTab('auto')} className={`flex-1 py-3 text-sm font-medium transition-colors ${modalTab === 'auto' ? 'text-white border-b-2 border-blue-500 bg-blue-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Auto Login (OAuth)
              </button>
              <button onClick={() => setModalTab('manual')} className={`flex-1 py-3 text-sm font-medium transition-colors ${modalTab === 'manual' ? 'text-white border-b-2 border-blue-500 bg-blue-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Manual Setup
              </button>
            </div>

            <div className="p-6">
              {modalTab === 'auto' ? (
                <div className="text-center py-6">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${activeModal === 'facebook' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <Key className="w-8 h-8" />
                  </div>
                  <h3 className="text-white font-medium mb-2">One-Click Connection</h3>
                  <p className="text-sm text-zinc-400 mb-6">Securely connect your {activeModal} account using official API authorization.</p>
                  
                  {/* 💥 Dropdown for Selecting Page if pages are fetched */}
                  {activeModal === 'facebook' && availablePages.length > 0 ? (
                    <div className="text-left space-y-4">
                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wider">Select your Page</label>
                        <select 
                          className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                          value={selectedPageIndex}
                          onChange={(e) => setSelectedPageIndex(e.target.value)}
                        >
                          {availablePages.map((page, index) => (
                            <option key={page.pageId} value={index}>
                              {page.pageName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={handleSelectPageAndSave}
                        disabled={integrationSaving}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
                      >
                        {integrationSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {integrationSaving ? 'Saving...' : 'Connect Selected Page'}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => activeModal === 'facebook' ? handleFacebookAutoLogin() : alert('WhatsApp Auto Setup is coming soon!')}
                      disabled={integrationSaving}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${activeModal === 'facebook' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-70`}
                    >
                      {integrationSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                      {integrationSaving ? 'Fetching Pages...' : `Continue with ${activeModal.charAt(0).toUpperCase() + activeModal.slice(1)}`}
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleIntegrationSave} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wider">
                      {activeModal === 'facebook' ? 'Page ID' : 'Phone Number ID'}
                    </label>
                    <input required type="text" value={manualFormData.id} onChange={e => setManualFormData({...manualFormData, id: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder={`Enter your ${activeModal === 'facebook' ? 'Page ID' : 'Number ID'}...`} />
                  </div>
                  
                  {activeModal === 'facebook' && (
                    <div>
                      <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wider">Page Name (Optional)</label>
                      <input type="text" value={manualFormData.name} onChange={e => setManualFormData({...manualFormData, name: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" placeholder="e.g. Aurelian Official" />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wider">Permanent Access Token</label>
                    <textarea required rows={3} value={manualFormData.token} onChange={e => setManualFormData({...manualFormData, token: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 custom-scrollbar" placeholder="Paste your long-lived access token here..." />
                  </div>

                  <button type="submit" disabled={integrationSaving} className="w-full mt-2 py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
                    {integrationSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Manual Connection
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-500" /> AI Brain Setup
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Configure your AI assistant's personality, behavior, and enterprise integrations.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70">
          {saving ? <Zap className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving Config...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── Main Configuration ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ========================================== */}
          {/* 💥 NEW: BYOK API Key Setup UI Box */}
          {/* ========================================== */}
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              {aiConfig.clientApiKey ? (
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-semibold rounded-full border border-green-500/20">Custom API Active</span>
              ) : aiConfig.useSystemApiKey ? (
                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-semibold rounded-full border border-blue-500/20">Pro System API</span>
              ) : (
                <span className="px-3 py-1 bg-red-500/10 text-red-500 text-xs font-semibold rounded-full border border-red-500/20">AI Engine Paused</span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-medium text-white">Custom AI Engine (BYOK)</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-5 max-w-xl">
              Power your assistant with your own Google Gemini API key. It's completely free! Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Gemini API Key</label>
              <input
                type="text"
                value={aiConfig.clientApiKey}
                onChange={(e) => setAiConfig({...aiConfig, clientApiKey: e.target.value})}
                className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-yellow-500/50 transition-all font-mono"
                placeholder="Paste your API key here (e.g., AIzaSy...)"
              />
            </div>
          </div>
          {/* ========================================== */}

          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-zinc-300" />
              <h2 className="text-lg font-medium text-white">System Prompt (Persona)</h2>
            </div>
            <textarea
              rows={6}
              value={aiConfig.systemPrompt}
              onChange={(e) => setAiConfig({...aiConfig, systemPrompt: e.target.value})}
              className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-all custom-scrollbar leading-relaxed"
              placeholder="Tell your AI how to behave..."
            />
          </div>

          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sliders className="w-5 h-5 text-zinc-300" />
              <h2 className="text-lg font-medium text-white">Response Behavior</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Conversational Tone</label>
                <select value={aiConfig.tone} onChange={(e) => setAiConfig({...aiConfig, tone: e.target.value})} className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none">
                  <option value="professional">Professional & Corporate</option>
                  <option value="friendly">Friendly & Casual</option>
                  <option value="persuasive">Persuasive (Sales-focused)</option>
                  <option value="empathetic">Empathetic & Supportive</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Humanized Delay</label>
                <select value={aiConfig.delay} onChange={(e) => setAiConfig({...aiConfig, delay: e.target.value})} className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none">
                  <option value="0">Instant (No delay)</option>
                  <option value="2">2 Seconds (Fast typing)</option>
                  <option value="5">5 Seconds (Natural typing)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Global Auto-Reply</h3>
                <p className="text-xs text-zinc-500 mt-1">If disabled, the AI will only draft responses for you to approve.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={aiConfig.autoReply} onChange={() => setAiConfig({...aiConfig, autoReply: !aiConfig.autoReply})} />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* ─── Integrations ─── */}
        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Webhook className="w-5 h-5 text-zinc-300" />
              <h2 className="text-lg font-medium text-white">Platform Integrations</h2>
            </div>

            <div className="space-y-4">
              
              {/* Facebook Box */}
              <div className={`p-4 border rounded-xl relative overflow-hidden transition-colors ${aiConfig.integrations.facebook.isConnected ? 'border-blue-500/30 bg-blue-500/5' : 'border-zinc-800 bg-[#111111]'}`}>
                {aiConfig.integrations.facebook.isConnected && (
                  <div className="absolute top-0 right-0 p-3"><CheckCircle2 className="w-5 h-5 text-blue-500" /></div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${aiConfig.integrations.facebook.isConnected ? 'bg-blue-600/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Facebook & Instagram</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4 h-8">
                  {aiConfig.integrations.facebook.isConnected 
                    ? `Connected via ${aiConfig.integrations.facebook.connectionMethod} setup.` 
                    : 'Connect your page to enable AI auto-replies.'}
                </p>
                <button onClick={() => openIntegrationModal('facebook')} className="text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors w-full text-left flex justify-between items-center">
                  {aiConfig.integrations.facebook.isConnected ? 'Manage Connection' : 'Setup Connection'} <span>&rarr;</span>
                </button>
              </div>

              {/* WhatsApp Box */}
              <div className={`p-4 border rounded-xl relative overflow-hidden transition-colors ${aiConfig.integrations.whatsapp.isConnected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-[#111111]'}`}>
                {aiConfig.integrations.whatsapp.isConnected && (
                  <div className="absolute top-0 right-0 p-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${aiConfig.integrations.whatsapp.isConnected ? 'bg-emerald-600/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Phone className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">WhatsApp Business</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4 h-8">
                  {aiConfig.integrations.whatsapp.isConnected 
                    ? `Connected via ${aiConfig.integrations.whatsapp.connectionMethod} setup.` 
                    : 'Enable AI chat for your WhatsApp API number.'}
                </p>
                <button onClick={() => openIntegrationModal('whatsapp')} className="text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors w-full text-left flex justify-between items-center">
                  {aiConfig.integrations.whatsapp.isConnected ? 'Manage Connection' : 'Setup Connection'} <span>&rarr;</span>
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AISetup;