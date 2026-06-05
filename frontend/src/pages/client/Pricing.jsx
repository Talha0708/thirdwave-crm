import React from 'react';
import { CheckCircle2, Zap, Shield, Star } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: "Basic Plan",
      price: "500",
      description: "Perfect for small businesses starting with AI.",
      rpm: "3",
      msgLimit: "2,500",
      icon: <Star className="w-6 h-6 text-blue-500" />,
      color: "blue"
    },
    {
      name: "Pro Plan",
      price: "1200",
      description: "Ideal for growing e-commerce and agencies.",
      rpm: "5",
      msgLimit: "6,000",
      isPopular: true,
      icon: <Zap className="w-6 h-6 text-emerald-500" />,
      color: "emerald"
    },
    {
      name: "Enterprise Plan",
      price: "8000",
      description: "Heavy-duty AI automation for large corporations.",
      rpm: "10",
      msgLimit: "40,000",
      icon: <Shield className="w-6 h-6 text-purple-500" />,
      color: "purple"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-4">Upgrade Your AI Brain</h1>
        <p className="text-zinc-400 max-w-xl mx-auto">Choose the perfect plan to handle your customer volume. Scale seamlessly as your business grows with Thirdwave CRM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <div key={index} className={`relative bg-[#0A0A0A] border rounded-2xl p-8 flex flex-col ${plan.isPopular ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-zinc-800'}`}>
            
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
            )}

            <div className={`p-3 w-fit rounded-xl bg-${plan.color}-500/10 mb-6`}>
              {plan.icon}
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
            <p className="text-sm text-zinc-400 mb-6 h-10">{plan.description}</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">৳{plan.price}</span>
              <span className="text-zinc-500 text-sm">/month</span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-sm text-zinc-300">
                <CheckCircle2 className={`w-5 h-5 text-${plan.color}-500`} />
                <span><strong>{plan.msgLimit}</strong> AI Messages /mo</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-300">
                <CheckCircle2 className={`w-5 h-5 text-${plan.color}-500`} />
                <span><strong>{plan.rpm}</strong> Requests Per Minute (RPM)</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-300">
                <CheckCircle2 className={`w-5 h-5 text-${plan.color}-500`} />
                <span>Meta & WhatsApp Support</span>
              </li>
            </ul>

            <button className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${plan.isPopular ? 'bg-emerald-500 text-black hover:bg-emerald-600' : 'bg-white text-black hover:bg-zinc-200'}`}>
              Upgrade to {plan.name.split(' ')[0]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;