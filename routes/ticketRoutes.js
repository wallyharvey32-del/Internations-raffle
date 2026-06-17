import express from 'express';
import nodemailer from 'nodemailer'; 
import Purchase from '../models/Purchase.js';
import Ticket from '../models/Ticket.js';

const router = express.Router();

// Configure the automated email transport engine
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 🎟️ 1. NEW ENDPOINT: RESERVE & SHUFFLE TICKETS WITH TIMERS
router.get('/reserve', async (req, res) => {
    const qty = parseInt(req.query.qty, 10) || 1;
    const strategy = req.query.strategy || 'sequential';
    const now = new Date();

    try {
        // Find tickets that are completely un-purchased AND not currently held by another browser window
        const availablePool = await Ticket.find({
            isSold: false,
            $or: [
                { holdExpires: null },
                { holdExpires: { $lt: now } }
            ]
        }).sort({ ticketNumber: 1 });

        if (availablePool.length < qty) {
            return res.status(400).json({ 
                success: false, 
                message: `Sorry, not enough available numbers! Only ${availablePool.length} tickets remain in the active pool.` 
            });
        }

        let selectedTickets = [];

        if (strategy === 'sequential') {
            // Traverse pool to locate a continuous sequential line of numbers
            for (let i = 0; i <= availablePool.length - qty; i++) {
                let isContinuous = true;
                for (let j = 0; j < qty - 1; j++) {
                    if (availablePool[i + j].ticketNumber + 1 !== availablePool[i + j + 1].ticketNumber) {
                        isContinuous = false;
                        break;
                    }
                }
                if (isContinuous) {
                    selectedTickets = availablePool.slice(i, i + qty);
                    break;
                }
            }
            // Fallback to basic array segmentation if a perfect continuous run cannot be found
            if (selectedTickets.length === 0) {
                selectedTickets = availablePool.slice(0, qty);
            }
        } else {
            // Randomized Luck: Randomize local available indexes array structure and slice allocation target
            const randomizedPool = availablePool.sort(() => 0.5 - Math.random());
            selectedTickets = randomizedPool.slice(0, qty);
        }

        // Establish the 5-Minute Reservation Countdown Lock (300,000 ms)
        const holdingExpirationWindow = new Date(now.getTime() + 5 * 60 * 1000);
        const ticketIds = selectedTickets.map(t => t._id);

        await Ticket.updateMany(
            { _id: { $in: ticketIds } },
            { $set: { holdExpires: holdingExpirationWindow } }
        );

        res.status(200).json({
            success: true,
            numbers: selectedTickets.map(t => t.ticketNumber)
        });

    } catch (error) {
        console.error(`❌ Reservation Engine Failure: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal allocation hold processing fault.' });
    }
});


// 💳 2. UPDATED ENDPOINT: PERMANENTLY PURCHASE SECURED NUMBERS
router.post('/purchase', async (req, res) => {
    try {
        const { buyerName, buyerEmail, buyerPhone, isOver18, ticketsPurchasedNumbers } = req.body;

        // 1. Data and Payload Validation
        if (!buyerName || !buyerEmail || !buyerPhone || !ticketsPurchasedNumbers || ticketsPurchasedNumbers.length === 0) {
            return res.status(400).json({ success: false, message: 'Please fulfill all required fields.' });
        }
        if (!isOver18) {
            return res.status(400).json({ success: false, message: 'Buyers must be 18 years of age or older.' });
        }

        const quantity = ticketsPurchasedNumbers.length;
        const TICKET_PRICE = 5;
        const totalCost = quantity * TICKET_PRICE;

        // Verify that the chosen tickets haven't accidentally been stolen out from under them by an expired timer
        const targetTickets = await Ticket.find({ ticketNumber: { $in: ticketsPurchasedNumbers }, isSold: false });
        if (targetTickets.length < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Your ticket hold timer expired and some numbers were reclaimed. Please reshuffle and try again!' 
            });
        }

        // 2. Record the master purchase transaction ledger
        const newPurchase = new Purchase({
            buyerName,
            buyerEmail,
            buyerPhone,
            ticketsPurchased: quantity,
            totalCost,
            isOver18: true,
        });

        const savedPurchase = await newPurchase.save();

        // 3. Convert the temporary hold flags into permanent closed sales records
        await Ticket.updateMany(
            { ticketNumber: { $in: ticketsPurchasedNumbers } },
            { 
                $set: { 
                    isSold: true, 
                    holdExpires: null, // Clear hold because it is now officially bought
                    purchasedBy: savedPurchase._id,
                    soldAt: new Date()
                } 
            }
        );

        // 4. FIRE COMPLIANT NODEMAILER DISPATCH (With BCC Backup Rule)
        // Only attempt to construct and send if credentials actually exist and aren't blank strings
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER.trim() !== "" && process.env.EMAIL_PASS.trim() !== "") {
            
            const emailContent = `
                <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #1c16be;">🎟️ Charity Raffle Receipt</h2>
                    <p>Thank you for your generous purchase, <strong>${buyerName}</strong>!</p>
                    <p>Your contribution directly supports the vital work done by <strong>Charity Variety</strong>.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p><strong>Total Paid:</strong> $${totalCost.toFixed(2)} AUD</p>
                    <p><strong>Your Lucky Allocated Numbers:</strong></p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 1.2rem; letter-spacing: 2px;">
                        ${ticketsPurchasedNumbers.map(n => `#${n}`).join(' &nbsp; ')}
                    </div>
                    <p style="font-size: 0.8rem; color: #777; margin-top: 20px;">Transaction Verification Token: ${savedPurchase._id}</p>
                </div>
            `;

            const mailOptions = { 
                from: process.env.EMAIL_USER, 
                to: buyerEmail, 
                bcc: process.env.EMAIL_USER, 
                subject: 'Your Internations Bowls Raffle Ticket Numbers!', 
                html: emailContent 
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) console.error(`⚠️ Email dispatch anomaly: ${err.message}`);
                else console.log(`✉️ Receipt dispatched completely: ${info.response}`);
            });
        } else {
            console.log("ℹ️ Skipping email dispatch: No active email credentials found in your environment configuration.");
        }

        // 5. Return complete success confirmation state to layout view
        res.status(201).json({
            success: true,
            message: 'Raffle tickets purchased successfully!',
            transactionId: savedPurchase._id,
            assignedNumbers: ticketsPurchasedNumbers,
            totalCost
        });

    } catch (error) {
        console.error(`❌ Transaction Processing Failure: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal server payment processing error.' });
    }
});

// @route   GET /api/tickets/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
    try {
        const totalPool = 4000;
        const ticketsSold = await Ticket.countDocuments({ isSold: true });
        const transactions = await Purchase.find().sort({ createdAt: -1 }); 

        const ticketsRemaining = totalPool - ticketsSold;
        const revenue = ticketsSold * 5; 

        res.status(200).json({
            success: true,
            totalPool,
            ticketsSold,
            ticketsRemaining,
            revenue,
            transactions
        });
    } catch (error) {
        console.error(`❌ Admin Data Fetch Failure: ${error.message}`);
        res.status(500).json({ success: false, message: 'Failed to aggregate administrative data streams.' });
    }
});

// @route   POST /api/tickets/draw-winner
router.post('/draw-winner', async (req, res) => {
    try {
        const { managerAuthCode } = req.body;
        const SECRET_ACCESS_CODE = "Test123"; 

        if (!managerAuthCode || managerAuthCode.trim() !== SECRET_ACCESS_CODE) {
            return res.status(401).json({ success: false, message: '❌ ACCESS DENIED: Invalid administrative code.' });
        }

        const soldTickets = await Ticket.find({ isSold: true }).populate('purchasedBy');
        if (soldTickets.length === 0) {
            return res.status(400).json({ success: false, message: 'No tickets have been sold yet.' });
        }

        if (!global.drawnWinnerNumbers) {
            global.drawnWinnerNumbers = [];
        }

        const eligibleTickets = soldTickets.filter(ticket => {
            return !global.drawnWinnerNumbers.includes(ticket.ticketNumber);
        });

        if (eligibleTickets.length === 0) {
            return res.status(400).json({ success: false, message: 'All sold tickets have already won a prize!' });
        }

        const randomIndex = Math.floor(Math.random() * eligibleTickets.length);
        const winningTicket = eligibleTickets[randomIndex];

        global.drawnWinnerNumbers.push(winningTicket.ticketNumber);
        const buyerInfo = winningTicket.purchasedBy;

        res.status(200).json({
            success: true,
            winningNumber: winningTicket.ticketNumber,
            winnerDetails: {
                name: buyerInfo ? buyerInfo.buyerName : 'Anonymous Buyer',
                email: buyerInfo ? buyerInfo.buyerEmail : 'N/A',
                phone: buyerInfo ? buyerInfo.buyerPhone : 'N/A'
            }
        });
    } catch (error) {
        console.error(`❌ Draw Engine Failure: ${error.message}`);
        res.status(500).json({ success: false, message: 'Draw engine execution fault.' });
    }
});

export default router;