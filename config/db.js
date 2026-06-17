import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // Mongoose v9+ simplifies connections by handling modern parsing options natively
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`🚀 MongoDB Connected Safely: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Database Connection Error: ${error.message}`);
        process.exit(1); // Shuts down the server immediately if the database isn't running
    }
};

export default connectDB;