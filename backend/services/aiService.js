import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateAIResponse = async (customerMessage, systemPrompt, products = []) => {
    try {
        // চেক করা যে .env ফাইলে API Key বসানো আছে কি না
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is missing in .env file!");
            return "System Error: AI Engine is not configured yet.";
        }

        // Gemini ইনিশিয়ালাইজ করা (gemini-1.5-flash সবচেয়ে ফাস্ট এবং লেটেস্ট)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

        // 💥 AI-এর জন্য মাস্টার প্রম্পট (Instruction) রেডি করা
        let fullPrompt = `${systemPrompt}\n\n`;

        // যদি ডেটাবেসে প্রোডাক্ট থাকে, তবে সেগুলো AI-কে জানিয়ে দেওয়া
        if (products && products.length > 0) {
            fullPrompt += `Here is your current product catalog:\n`;
            products.forEach(p => {
                fullPrompt += `- ${p.name}: ৳${p.price} (Category: ${p.category})\n`;
            });
            fullPrompt += `\nImportant: Only recommend products from the catalog above. Do not invent any new products.\n\n`;
        }

        fullPrompt += `Customer Message: "${customerMessage}"\n`;
        fullPrompt += `Your Reply:`;

        // জেমিনাইকে রিকোয়েস্ট পাঠানো এবং রিপ্লাই আনা
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        
        return response.text();

    } catch (error) {
        console.error("Gemini AI Engine Error:", error);
        return "Sorry, I am facing a temporary network issue. Please hold on, a human agent will reply soon!";
    }
};