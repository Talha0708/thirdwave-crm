import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 
import { Loader2, ArrowRight, MessageSquare, Phone, Server, Shield, Code, BarChart, Mail, AlertCircle } from 'lucide-react';

const Login = () => {
    const { login, user, token } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm-cu8c.vercel.app/api';

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (token && user) {
            if (user.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/client/dashboard', { replace: true });
            }
        }
    }, [user, token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // ✅ ফেক লোডিং ইফেক্ট (১.৫ সেকেন্ড) যাতে রিয়েলিস্টিক লাগে
            await new Promise(resolve => setTimeout(resolve, 1500));

            // ─── MOCK LOGIN LOGIC (Backend ছাড়াই টেস্টিংয়ের জন্য) ───
            
            // যদি ইমেইলে 'admin' লেখা থাকে, তাহলে অ্যাডমিন ড্যাশবোর্ডে যাবে
            if (email.includes('admin')) {
                const adminData = {
                    name: 'Talha Belal',
                    email: email,
                    role: 'admin'
                };
                login(adminData, 'fake-admin-token-12345');
                navigate('/admin/dashboard', { replace: true });
            } 
            // অন্য যেকোনো ইমেইল দিলে ক্লায়েন্ট ড্যাশবোর্ডে যাবে
            else {
                const clientData = {
                    name: 'Test Client',
                    email: email,
                    role: 'user'
                };
                login(clientData, 'fake-client-token-67890');
                navigate('/client/dashboard', { replace: true });
            }

        } catch (err) {
            setError('Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] text-zinc-300 font-sans selection:bg-zinc-800 selection:text-white overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

            {/* Navbar */}
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-black/80 backdrop-blur-md border-zinc-800 py-3 sm:py-4' : 'bg-transparent border-transparent py-4 sm:py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-lg rounded-sm shrink-0">T</div>
                        <span className="font-semibold text-white tracking-tight hidden sm:block">Thirdwave Future Tech</span>
                        <span className="font-semibold text-white tracking-tight sm:hidden">Thirdwave</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#founder" className="hover:text-white transition-colors">Vision</a>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-5">
                        <a href="mailto:talhabelal10@gmail.com" className="hidden lg:flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            <Mail className="w-4 h-4" /> Support
                        </a>
                        <a href="tel:01987573397" className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white bg-zinc-900 border border-zinc-800 px-3 sm:px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors active:scale-95">
                            <Phone className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">01987573397</span><span className="sm:hidden">Call</span>
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero & Login Section */}
            <main className="relative pt-28 sm:pt-32 pb-16 sm:pb-24 border-b border-zinc-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
                    
                    {/* Left Content */}
                    <div className="w-full lg:w-1/2 relative z-10 text-center lg:text-left mt-8 lg:mt-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 mb-6 sm:mb-8 mx-auto lg:mx-0">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs font-medium text-zinc-300">THIRDWAVE-CRM</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.15] tracking-tight mb-4 sm:mb-6">
                            Commerce infrastructure <br className="hidden lg:block" /> built for scale.
                        </h1>
                        <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
                            A highly optimized CRM and automation engine. Manage Facebook interactions, analyze Meta ROAS, and streamline your entire digital operation from one dashboard.
                        </p>
                        <div className="flex flex-col sm:flex-row lg:flex-col justify-center lg:justify-start gap-3 sm:gap-6 lg:gap-3 text-sm text-zinc-500 font-medium">
                            <div className="flex items-center justify-center lg:justify-start gap-2"><Shield className="w-4 h-4 text-zinc-400" /> End-to-end encrypted</div>
                            <div className="flex items-center justify-center lg:justify-start gap-2"><Server className="w-4 h-4 text-zinc-400" /> Vercel Edge Network</div>
                        </div>
                    </div>

                    {/* Right Login Box */}
                    <div className="w-full lg:w-1/2 max-w-md mx-auto lg:mx-0 relative z-10">
                        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl w-full">
                            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1">Sign in</h2>
                            <p className="text-sm text-zinc-500 mb-6 sm:mb-8">Continue to your workspace</p>

                            {error && (
                                <div className="mb-6 px-4 py-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-start sm:items-center">
                                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-zinc-400">Work Email</label>
                                    <input 
                                        required 
                                        type="email" 
                                        placeholder="name@company.com" 
                                        className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-zinc-400">Password</label>
                                    </div>
                                    <input 
                                        required 
                                        type="password" 
                                        placeholder="••••••••" 
                                        className="w-full px-4 py-3 bg-[#111111] border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Login to Dashboard <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="py-16 sm:py-24 border-b border-zinc-900 bg-[#050505]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="p-6 sm:p-8 border border-zinc-800 rounded-2xl bg-[#0A0A0A] hover:border-zinc-700 transition-colors group">
                            <MessageSquare className="w-6 h-6 text-white mb-5 group-hover:scale-110 transition-transform" />
                            <h3 className="text-white font-medium text-lg mb-2">Automated Inbox</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">Connect your Meta webhooks directly. Our AI processes customer inquiries instantly, reducing manual support hours by 80%.</p>
                        </div>
                        <div className="p-6 sm:p-8 border border-zinc-800 rounded-2xl bg-[#0A0A0A] hover:border-zinc-700 transition-colors group">
                            <BarChart className="w-6 h-6 text-white mb-5 group-hover:scale-110 transition-transform" />
                            <h3 className="text-white font-medium text-lg mb-2">Centralized Analytics</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">Track precise ad spend, customer acquisition costs, and real-time revenue metrics without switching between platforms.</p>
                        </div>
                        <div className="p-6 sm:p-8 border border-zinc-800 rounded-2xl bg-[#0A0A0A] hover:border-zinc-700 transition-colors group sm:col-span-2 lg:col-span-1">
                            <Code className="w-6 h-6 text-white mb-5 group-hover:scale-110 transition-transform" />
                            <h3 className="text-white font-medium text-lg mb-2">Zero Third-Party Bloat</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">No slow website builders. Engineered purely with custom React and Next.js for sub-second load times and absolute data control.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Founder Section */}
            <section id="founder" className="py-20 sm:py-32 border-b border-zinc-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="border-l-2 border-zinc-800 pl-6 sm:pl-10 lg:pl-12">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white mb-6 sm:mb-8 leading-snug">Built from actual operational bottlenecks.</h2>
                        <div className="space-y-6 text-zinc-400 text-base sm:text-lg leading-relaxed">
                            <p>"Thirdwave CRM is an AI-powered customer relationship management platform engineered exclusively for the operational demands of modern e-commerce. By unifying Facebook, WhatsApp, and critical messaging channels into a single intelligent architecture, the system automates the entire customer communication lifecycle — from initial inquiry through to conversion — eliminating the response delays, lead leakage, and manual bottlenecks that consistently undermine revenue at scale. Every inbound message is handled instantly, accurately, and in brand voice, with automated lead qualification, objection handling, and follow-up sequences executing without human intervention. Built on proprietary infrastructure rather than generic third-party platforms, Thirdwave CRM was designed with one mandate: to close the gap between customer intent and business response — and to do so with the precision, consistency, and intelligence that growth-stage e-commerce operations demand."</p>
                            <p>"Thirdwave Future Tech wasn't built as a theoretical software project. It was coded from necessity. We bypassed generic third-party platforms to build a custom architecture that directly solves the operational pain points of modern e-commerce."</p>
                        </div>
                        <div className="mt-10 sm:mt-12 flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-white font-semibold shrink-0">TB</div>
                            <div>
                                <p className="text-white font-medium text-base">Talha Belal</p>
                                <p className="text-sm text-zinc-500">Founder & CEO</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 sm:py-12 bg-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-bold text-xs rounded-sm shrink-0">T</div>
                        <span className="text-sm font-semibold text-zinc-400">Thirdwave Future Tech</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-sm text-zinc-500">
                        <a href="mailto:talhabelal10@gmail.com" className="hover:text-white transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> talhabelal10@gmail.com</a>
                        <a href="tel:01987573397" className="hover:text-white transition-colors flex items-center gap-2"><Phone className="w-4 h-4" /> 01987573397</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Login;