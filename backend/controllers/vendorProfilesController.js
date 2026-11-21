const VendorProfile = require('../models/vendorProfileModel');

exports.getMyVendorProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await VendorProfile.findOne({ user: userId }).lean();
    if (!profile) return res.status(404).json({ error: 'Vendor profile not found' });
    return res.json(profile);
  } catch (e) { next(e); }
};

exports.upsertMyVendorProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const payload = {};
    const allowed = ['companyName','crNumber','taxId','phone','website','address','documents'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    }
    if (!payload.companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    const updated = await VendorProfile.findOneAndUpdate(
      { user: userId },
      { $set: payload, $setOnInsert: { user: userId } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json(updated);
  } catch (e) { next(e); }
};