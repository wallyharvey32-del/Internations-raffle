import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    ticketNumber: {
        type: Number,
        required: true,
        unique: true
    },
    isSold: {
        type: Boolean,
        default: false
    },
    holdExpires: { type: Date, default: null },
    
    purchasedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase', // Connects this entry directly to the matching Purchase record
        default: null
    },
    soldAt: {
        type: Date,
        default: null
    }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;