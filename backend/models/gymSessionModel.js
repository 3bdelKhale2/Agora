const mongoose = require('mongoose');

const gymSessionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['yoga', 'pilates', 'aerobics', 'zumba', 'cross circuit', 'kick-boxing'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Gym'
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
});

module.exports = mongoose.model('GymSession', gymSessionSchema);
