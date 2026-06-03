import React, { useState } from 'react';
import { PackageSearch, Plus, Search, Filter, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';

const ProductCatalog = () => {
  // ডামি প্রোডাক্ট ডেটা 
  const [products] = useState([
    { id: 'PRD-001', name: 'Aurelian Premium Oxford Shirt', price: '৳ 1090', stock: 45, status: 'In Stock', aiTrained: true },
    { id: 'PRD-002', name: 'Aurelian Campaign Tee', price: '৳ 799', stock: 120, status: 'In Stock', aiTrained: true },
    { id: 'PRD-003', name: 'Premium Denim Jacket', price: '৳ 2450', stock: 12, status: 'Low Stock', aiTrained: true },
    { id: 'PRD-004', name: 'Classic Chino Pants', price: '৳ 1250', stock: 0, status: 'Out of Stock', aiTrained: false },
  ]);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <PackageSearch className="w-7 h-7 text-indigo-500" /> Product Catalog
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your products and train your AI on inventory.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search products by name or ID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors shrink-0">
          <Filter className="w-4 h-4" /> <span className="text-sm font-medium">Filters</span>
        </button>
      </div>

      {/* ─── Product Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-colors flex flex-col">
            
            {/* Image Placeholder */}
            <div className="h-40 bg-[#111111] border-b border-zinc-800 flex items-center justify-center relative">
              <PackageSearch className="w-10 h-10 text-zinc-700" />
              
              {/* AI Trained Badge */}
              <div className="absolute top-3 left-3">
                {product.aiTrained ? (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold rounded-full uppercase tracking-wider backdrop-blur-md">
                    <CheckCircle2 className="w-3 h-3" /> AI Synced
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-[10px] font-semibold rounded-full uppercase tracking-wider backdrop-blur-md">
                    <XCircle className="w-3 h-3" /> Not Synced
                  </span>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-mono text-zinc-500">{product.id}</p>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  product.stock > 10 ? 'text-emerald-500' : product.stock > 0 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {product.status}
                </span>
              </div>
              
              <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">{product.name}</h3>
              <p className="text-lg font-semibold text-zinc-300 mt-auto">{product.price}</p>
            </div>

            {/* Actions Footer */}
            <div className="px-5 py-3 border-t border-zinc-800/50 bg-[#050505] flex justify-between items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-zinc-500 font-medium">Stock: {product.stock}</span>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-md transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 text-red-400/70 hover:text-red-400 bg-red-950/30 rounded-md transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default ProductCatalog;