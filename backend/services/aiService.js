import { GoogleGenerativeAI } from '@google/generative-ai';

// 💥 FIX: ৩ নম্বর প্যারামিটারে products এর জায়গায় historyArray রিসিভ করা হচ্ছে
export const generateAIResponse = async (customerMessage, systemPrompt, historyArray = []) => {
    try {
        // চেক করা যে .env ফাইলে API Key বসানো আছে কি না
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is missing in .env file!");
            return "System Error: AI Engine is not configured yet.";
        }

        // Gemini ইনিশিয়ালাইজ করা
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // 💥 FIX: তোর লেটেস্ট মডেল এবং সিস্টেম ইনস্ট্রাকশন (যার ভেতরে অলরেডি প্রোডাক্ট ক্যাটালগ আছে)
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