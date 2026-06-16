import { GoogleGenerativeAI } from '@google/generative-ai';

// 💥 FIX: ৪ নম্বর প্যারামিটারে apiKey রিসিভ করা হচ্ছে
export const generateAIResponse = async (customerMessage, systemPrompt, historyArray = [], apiKey) => {
    try {
        // চেক করা যে API Key পাস করা হয়েছে কি না (ক্লায়েন্টের বা সিস্টেমের)
        if (!apiKey) {
            console.error("❌ API Key is missing for this transaction!");
            return "দুঃখিত, AI সিস্টেমটি বর্তমানে কনফিগার করা নেই। দয়া করে পেজ অ্যাডমিনের সাথে যোগাযোগ করুন।";
        }

        // 💥 FIX: ডাইনামিক API Key দিয়ে Gemini ইনিশিয়ালাইজ করা
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // তোর লেটেস্ট মডেল এবং সিস্টেম ইনস্ট্রাকশন
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite", 
            systemInstruction: systemPrompt 
        });

        let contents = [];

        // যদি ডাটাবেস থেকে হিস্ট্রি আসে (যেখানে কাস্টমারের বর্তমান মেসেজটাও অলরেডি পুশ করা আছে)
        if (historyArray && historyArray.length > 0) {
            contents = historyArray.map(msg => ({
                // জেমিনাই 'assistant' চেনে না, ওর কাছে AI-এর রিপ্লাই হলো 'model'
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
        } else {
            // যদি কোনো কারণে হিস্ট্রি না থাকে (ফলব্যাক), শুধু বর্তমান মেসেজটা পাঠাবে
            contents = [{ role: "user", parts: [{ text: customerMessage }] }];
        }

        // জেমিনাইকে রিকোয়েস্ট পাঠানো (পুরো হিস্ট্রি সহ)
        const result = await model.generateContent({ contents });
        const response = await result.response;
        
        return response.text();

    } catch (error) {
        console.error("Gemini AI Engine Error:", error);
        return "Sorry, I am facing a temporary network issue. Please hold on, a human agent will reply soon!";
    }
};