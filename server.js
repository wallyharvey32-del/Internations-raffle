import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']); // Forces Node to bypass local router DNS blocks
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'node:path'; // <-- Added this to handle directory paths safely
import { fileURLToPath } from 'node:url'; // <-- Added for ES module pathing
import connectDB from './config/db.js'; 
import ticketRoutes from './routes/ticketRoutes.js';

// Setup __dirname workaround for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Activate Middleware
app.use(cors());          
app.use(express.json());  

// Serve static assets from both the root and the public folder
app.use(express.static('.'));
app.use('/public', express.static('public'));

// Connect to MongoDB
connectDB();

// 📂 EXPLICIT ROUTE FOR TICKETS PAGE
// This ensures typing /tickets or clicking the link serves the correct file from public
app.get('/tickets', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tickets.html'));
});

// 🚀 MOUNT TICKET ROUTES
app.use('/api/tickets', ticketRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`⚡ Server operating beautifully on http://localhost:${PORT}`);
});