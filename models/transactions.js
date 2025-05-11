const mongoose = require('mongoose');
const User = require('./user');

const transactionsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },  
    OrderID: {
        type: String,
        required: true,
        unique: true
    },
    Amount: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    method:{
        type: String,
        default: 'Crypto'
    }
});

const Transactions = mongoose.models.Transactions || mongoose.model('Transactions', transactionsSchema);

module.exports = Transactions;