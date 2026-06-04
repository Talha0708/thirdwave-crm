// ─── ক্লায়েন্ট এডিট/সাসপেন্ড করার ফাংশন (BULLETPROOF VERSION) ───
export const updateClient = async (req, res) => {
    try {
        const { plan, mrr, status } = req.body;
        
        // $set ব্যবহার করলে Mongoose কোনো কথা ছাড়া সরাসরি ডেটাবেসে ডেটা ফোর্স-আপডেট করে দেয়
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    plan: plan, 
                    mrr: Number(mrr), // MRR টাকে নিশ্চিত নাম্বার হিসেবে সেভ করছি
                    status: status 
                } 
            },
            { new: true } // আপডেট হওয়ার পর নতুন ডেটা রিটার্ন করবে
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Client updated successfully', 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Update Client Error:", error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};