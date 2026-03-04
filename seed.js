require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seed = async () => {
    await connectDB();

    try {
        // Remove existing admin
        await User.deleteOne({ email: 'admin@campus.com' });

        // Create admin user
        const admin = await User.create({
            name: 'Administrator',
            email: 'admin@campus.com',
            password: 'admin123',
            role: 'admin'
        });

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@campus.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Role:', admin.role);
    } catch (error) {
        console.error('❌ Seed error:', error.message);
    } finally {
        mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
};

seed();
