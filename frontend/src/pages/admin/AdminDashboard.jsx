import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Users, Shield, FolderKanban, CircleDollarSign, Loader2, Activity } from 'lucide-react';

const AdminDashboard = () => {
    const { user, token } = useAuth();
    const [stats, setStats] = useState({ totalClients: 0, totalAdmins: 0, activeProjects: 0, revenue: 0 });
    const [recentUsers, setRecentUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // API কল করার সময় টোকেন পাঠানো (বেস্ট প্র্যাকটিস)
                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                };
                const response = await axios.get(`${API_URL}/admin/dashboard-stats`, config);
                
                if (response.data.success) {
                    setStats(response.data.stats);
                    setRecentUsers(response.data.recentUsers);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchDashboardData();
        }
    }, [API_URL, token]);

    // ডেটা লোড হওয়ার সময় সুন্দর একটা স্পিনার দেখাবে
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <Loader2 className="w-10 h-10 text-zinc-400 animate-spin mb-4" />
                <p className="text-zinc-500 font-medium animate-pulse">Syncing with database...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Overview</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Welcome back, <span className="text-zinc-200 font-medium">{user?.name}</span>. Here's what's happening today.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium text-green-400">System Online</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Stat Card 1 */}
                <div className="p-6 bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-16 h-16 text-white" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-zinc-400 mb-2">Total Clients</p>
                        <h3 className="text-3xl font-bold text-white">{stats.totalClients}</h3>
                    </div>
                </div>

                {/* Stat Card 2 */}
                <div className="p-6 bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Shield className="w-16 h-16 text-white" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-zinc-400 mb-2">System Admins</p>
                        <h3 className="text-3xl font-bold text-white">{stats.totalAdmins}</h3>
                    </div>
                </div>

                {/* Stat Card 3 */}
                <div className="p-6 bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FolderKanban className="w-16 h-16 text-white" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-zinc-400 mb-2">Active Projects</p>
                        <h3 className="text-3xl font-bold text-white">{stats.activeProjects}</h3>
                    </div>
                </div>

                {/* Stat Card 4 */}
                <div className="p-6 bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CircleDollarSign className="w-16 h-16 text-white" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-zinc-400 mb-2">Revenue (USD)</p>
                        <h3 className="text-3xl font-bold text-white">${stats.revenue}</h3>
                    </div>
                </div>
            </div>

            {/* Recent Users Table */}
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-zinc-400" /> Recent Registrations
                        </h2>
                        <p className="text-sm text-zinc-500 mt-1">Latest users joined the platform.</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-[#111111] text-zinc-300 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4 border-b border-zinc-800">User Details</th>
                                <th className="px-6 py-4 border-b border-zinc-800">Role</th>
                                <th className="px-6 py-4 border-b border-zinc-800">Company</th>
                                <th className="px-6 py-4 border-b border-zinc-800">Joined Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {recentUsers.length > 0 ? (
                                recentUsers.map((client) => (
                                    <tr key={client._id} className="hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{client.name}</p>
                                                    <p className="text-xs text-zinc-500">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                                                {client.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {client.company || <span className="text-zinc-600">N/A</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(client.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-zinc-500">
                                        No users found in the database.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;