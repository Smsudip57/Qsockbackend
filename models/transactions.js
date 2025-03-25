const mongoose = require('mongoose');

const transactionsSchema = new mongoose.Schema({
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