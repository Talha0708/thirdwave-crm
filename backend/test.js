const axios = require('axios');

const testData = {
    clientName: "Talha Belal",
    companyName: "Aurelian",
    email: "talha@example.com",
    projectType: "E-commerce Website",
    status: "In Progress",
    budget: 15000,
    paidAmount: 5000,
    notes: [{ message: "Initial meeting done. Design approved." }]
};

async function createTestClient() {
    try {
        const response = await axios.post('http://localhost:5000/api/clients', testData);
        console.log("Response from Server:", response.data.message);
        console.log("Saved Client ID:", response.data.client._id);
    } catch (error) {
        console.error("Test Failed! Make sure server.js is running.");
    }
}

createTestClient();