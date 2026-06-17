import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']); // Keep our DNS fix here too!

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from './models/Ticket.js';
import Purchase from './models/Purchase.js';

dotenv.config();

const seedTickets = async () => {
    try {
        // 1. Connect directly to Atlas
        await mongoose.connect(process.env.MONGO_URI);
        console.log('连接成功 Connected to Atlas database for seeding...');

        // 2. Clear out any old ticket placeholders to start fresh
        await Ticket.deleteMany({});
        await Purchase.deleteMany({});
        console.log('🧹 Old ticket records cleared safely.');

        // 3. Generate our range of ticket numbers algorithmically
        const ticketsArray = [];
        const START_NUMBER = 1001;
        const END_NUMBER = 5000; // Adjust this if you want more or fewer tickets!

        for (let i = START_NUMBER; i <= END_NUMBER; i++) {
            ticketsArray.push({
                ticketNumber: i,
                isSold: false,
                purchasedBy: null,
                soldAt: null
            });
        }

        // 4. Bulk insert them into MongoDB in one efficient action
        console.log(`Creating database records for tickets ${START_NUMBER} to ${END_NUMBER}...`);
        await Ticket.insertMany(ticketsArray);
        
        console.log('🎉 Success! The ticket register has been seeded completely.');
        process.exit(0); // Exit smoothly
    } catch (error) {
        console.error(`❌ Seeding error occurred: ${error.message}`);
        process.exit(1);
    }
};

seedTickets();