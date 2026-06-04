import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { PackageSearch, Plus, Search, Filter, Edit, Trash2, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';

const ProductCatalog = () => {
  const { token } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ─── Modal States ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ 
      name: '', category: '', price: '', stock: '', sizes: [], status: 'Active' 
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

  // ─── Fetch Real Products ───
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/products?t=${new Date().getTime()}`, config);
      
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProducts();
  }, [API_URL, token]);

  const handleSizeToggle = (size) => {
      setFormData(prev => ({
          ...prev,
          sizes: prev.sizes.includes(size) 
              ? prev.sizes.filter(s => s !== size) 
              : [...prev.sizes, size]
      }));
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', category: '', price: '', stock: '', sizes: [], status: 'Active' });
  };

  // 💥 NEW FIX: Open Add Modal (সব ডেটা ফ্রেশ করে ওপেন করবে)
  const openAddModal = () => {
      setEditingId(null);
      setFormData({ name: '', category: '', price: '', stock: '', sizes: [], status: 'Active' });
      setIsModalOpen(true);
  };

  // ─── Open Edit Modal ───
  const openEditModal = (product) => {
      setEditingId(product._id);
      setFormData({
          name: product.name,
          category: product.category || '',
          price: product.price,
          stock: product.stock,
          sizes: product.sizes || [],
          status: product.status || 'Active'
      });
      setIsModalOpen(true);
  };

  // ─── Add or Update Product ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock)
      };

      if (editingId) {
          // Update API
          await axios.put(`${API_URL}/products/${editingId}`, payload, config);
      } else {
          // Create API
          await axios.post(`${API_URL}/products`, payload, config);
      }
      
      closeModal();
      await fetchProducts(); 
    } catch (err) {
      console.error("Failed to save product", err);
      const errorMessage = err.response?.data?.error || err.message || "Unknown Error";
      alert(`⚠️ Save Failed!\nReason: ${errorMessage}\n\nCheck if your backend is running.`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── Delete Product ───
  const handleDelete = async (id) => {
      if(!window.confirm("Are you sure you want to delete this product?")) return;
      try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          await axios.delete(`${API_URL}/products/${id}`, config);
          await fetchProducts();
      } catch (err) {
          console.error("Failed to delete", err);
      }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      
      {/* ─── ADD/EDIT Product Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl my-8">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800/50 sticky top-0 bg-[#0A0A0A] rounded-t-2xl z-10">
                    <h2 className="text-xl font-semibold text-white">
                        {editingId ? 'Update Product' : 'Add New Product'}
                    </h2>
                    <button onClick={closeModal} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-sm text-zinc-400 block mb-1.5">Product Name</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="e.g. Premium Oxford Shirt" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1.5">Category</label>
                            <input 
                                required 
                                type="text" 
                                list="category-options"
                                value={formData.category} 
                                onChange={e => setFormData({...formData, category: e.target.value})} 
                                className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" 
                                placeholder="Type or select..."
                            />
                            <datalist id="category-options">
                                <option value="Panjabi" />
                                <option value="Shirt" />
                                <option value="Pant" />
                                <option value="T-Shirt" />
                                <option value="Accessories" />
                            </datalist>
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1.5">Price (৳)</label>
                            <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="1090" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1.5">Stock</label>
                            <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="45" />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1.5">Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50">
                                <option value="Active">Active (In Stock)</option>
                                <option value="Draft">Draft (Hidden)</option>
                                <option value="Out of Stock">Out of Stock</option>
                            </select>
                        </div>
                    </div>

                    {/* Available Sizes Selection */}
                    <div>
                        <label className="text-sm text-zinc-400 block mb-2">Available Sizes</label>
                        <div className="flex gap-2 flex-wrap">
                            {['S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44'].map(size => (
                                <button 
                                    key={size} type="button" 
                                    onClick={() => handleSizeToggle(size)}
                                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                                        formData.sizes.includes(size) 
                                        ? 'bg-indigo-600 text-white border border-indigo-500' 
                                        : 'bg-[#111111] text-zinc-400 border border-zinc-800 hover:border-zinc-600'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={submitLoading} className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70">
                        {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Update Product' : 'Save Product')}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <PackageSearch className="w-7 h-7 text-indigo-500" /> Product Catalog
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your products and train your AI on inventory.</p>
        </div>
        {/* 💥 FIX: Add Product Button now properly resets state */}
        <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search products by name or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors shrink-0">
          <Filter className="w-4 h-4" /> <span className="text-sm font-medium">Filters</span>
        </button>
      </div>

      {/* ─── Product Grid ─── */}
      {loading ? (
          <div className="flex flex-col items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-zinc-500 text-sm animate-pulse">Loading inventory...</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                <div key={product._id} className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-colors flex flex-col">
                    
                    {/* Image Placeholder */}
                    <div className="h-40 bg-[#111111] border-b border-zinc-800 flex items-center justify-center relative">
                    <PackageSearch className="w-10 h-10 text-zinc-700" />
                    
                    <div className="absolute top-3 left-3">
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold rounded-full uppercase tracking-wider backdrop-blur-md">
                            <CheckCircle2 className="w-3 h-3" /> AI Synced
                        </span>
                    </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-mono text-zinc-500">{product.category || 'Product'}</p>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        product.stock > 10 ? 'text-emerald-500' : product.stock > 0 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </div>
                    
                    <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">{product.name}</h3>
                    
                    {/* Sizes UI */}
                    {product.sizes && product.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3 mt-1">
                            {product.sizes.map(s => (
                                <span key={s} className="text-[9px] px-1.5 py-0.5 border border-zinc-700 rounded text-zinc-400">{s}</span>
                            ))}
                        </div>
                    )}

                    <p className="text-lg font-semibold text-zinc-300 mt-auto">৳ {product.price}</p>
                    </div>

                    {/* Actions Footer */}
                    <div className="px-5 py-3 border-t border-zinc-800/50 bg-[#050505] flex justify-between items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-zinc-500 font-medium">Stock: {product.stock}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(product)} className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-md transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(product._id)} className="p-1.5 text-red-400/70 hover:text-red-400 bg-red-950/30 rounded-md transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    </div>

                </div>
                ))
            ) : (
                <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                    <PackageSearch className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white">No Products Found</h3>
                    <p className="text-sm text-zinc-500 mt-1">Click 'Add Product' to start building your catalog.</p>
                </div>
            )}
          </div>
      )}
    </div>
  );
};

export default ProductCatalog;