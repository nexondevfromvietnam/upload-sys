const mongoose = require('mongoose');
const { type } = require('os');

const fileSchema = new mongoose.Schema({
    filePath: {
        type: String,
        required: true,
    },    originalName: {
        type: String,
        required: true
    }, date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
