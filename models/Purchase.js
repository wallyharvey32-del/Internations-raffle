import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
    buyerName: {
        type: String,
        required: [true, 'Buyer name is required'],
        trim: true
    },
    buyerEmail: {
        type: String,
        required: [true, 'Email address is required'],
        trim: true,
        lowercase: true
    },
    buyerPhone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    isOver18: {
        type: Boolean,
        required: [true, 'Age confirmation is legally required'],
        // WA gaming compliance requires an explicit declaration
        validate: {
            validator: function(v) { return v === true; },
            message: 'Buyer must declare they are 18 years of age or older.'
        }
    },
    ticketsPurchased: {
        type: Number,
        required: [true, 'Number of tickets is required'],
        min: [1, 'Must purchase at least 1 ticket']
    },
    assignedNumbers: {
        type: [Number], // Array of integers (e.g., [1004, 1005, 1006])
        required: true
    },
    totalCost: {
        type: Number,
        required: true
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    }
});

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;