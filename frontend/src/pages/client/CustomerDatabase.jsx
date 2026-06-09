import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Filter, Phone, MapPin, Calendar, Loader2, ArrowUpRight } from 'lucide-react';

const CustomerDatabase = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(`${API_URL}/customers`, config);
        if (data.success) {
          setCustomers(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch customers", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchCustomers();
  }, [token]);

  // 💥 Search Logic Updated (ডেটাবেস স্কিমার সাথে মিল রেখে)
  const filteredCustomers = customers.filter(c =>
    (c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.customerPhone || '').includes(searchTerm)
  );

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 pb-10">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-500" /> Customer Database
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your leads, track spending, and view order history.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <button className="p-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Premium Table Section ─── */}
      <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 flex-1">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-zinc-500 text-sm">Loading database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-[#111111]/50">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Customer Profile</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Orders</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Spent</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-[#111111] transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
                            {(customer.customerName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-200">{customer.customerName || 'Unknown'}</div>
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" /> Last order: {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-300 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-zinc-500" /> {customer.customerPhone || 'N/A'}
                        </div>
                      </td>
                      {/* 💥 Location Column Updated: Now supports full address wrapping */}
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm text-zinc-400 flex items-start gap-2 max-w-[250px]">
                          <MapPin className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" /> 
                          <span className="break-words leading-relaxed">{customer.customerAddress || 'No address provided'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-zinc-800/50 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700/50">
                          {customer.totalOrders || 0} Orders
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-emerald-400">
                          ৳ {(customer.totalSpent || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 text-sm">
                      No customers found. Database will populate when new orders arrive.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDatabase;