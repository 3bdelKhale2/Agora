const GymSession = require('../models/gymSessionModel');

// GET /api/gym-sessions?month=YYYY-MM
exports.getGymSessionsByMonth = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ message: 'Month is required in format YYYY-MM' });
    }
    const [year, mon] = month.split('-');
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59, 999);
    const sessions = await GymSession.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: 1, startTime: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
