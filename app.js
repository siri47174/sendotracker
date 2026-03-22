const express = require('express');
const cors = require('cors');

const { FuelFill, Odometer, ScheduleConfig, Escalation } = require('./models');

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════
// FUEL FILLS ROUTES
// ═══════════════════════════════════════════════════════

// GET all fills for a month
app.get('/api/fills/:month', async (req, res) => {
  try {
    const fills = await FuelFill.find({ month: req.params.month }).lean();
    // Convert to app format: { vehicle: { date: { l, a, d, p, t, ... } } }
    const result = {};
    fills.forEach(f => {
      if (!result[f.vehicle]) result[f.vehicle] = {};
      result[f.vehicle][f.date] = {
        l: f.litres, a: f.amount, d: f.driver, p: f.paidBy, t: f.time,
        owner: f.owner, payType: f.payType, station: f.station,
        fills: f.fills?.length ? f.fills : undefined
      };
    });
    res.json({ success: true, data: result, month: req.params.month });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET available months
app.get('/api/months', async (req, res) => {
  try {
    const months = await FuelFill.distinct('month');
    months.sort((a, b) => {
      const ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [ma, ya] = a.split('-'), [mb, yb] = b.split('-');
      return (parseInt(ya) - parseInt(yb)) || (ms.indexOf(ma) - ms.indexOf(mb));
    });
    res.json({ success: true, months });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save single fill entry
app.post('/api/fills', async (req, res) => {
  try {
    const { vehicle, date, month, year, driver, owner, paidBy, payType,
            station, litres, amount, time, fills } = req.body;

    // Check if entry exists for same vehicle+date+month
    let entry = await FuelFill.findOne({ vehicle, date, month });
    if (entry) {
      // Add as multiple fill
      if (!entry.fills || !entry.fills.length) {
        entry.fills = [{ l: entry.litres, a: entry.amount, d: entry.driver,
                         p: entry.paidBy, t: entry.time }];
      }
      entry.fills.push({ l: litres, a: amount, d: driver, p: paidBy, t: time });
      entry.litres += litres;
      entry.amount += amount;
      entry.updatedAt = new Date();
      await entry.save();
    } else {
      entry = await FuelFill.create({
        vehicle, date, month, year: year || month.split('-')[1],
        driver, owner, paidBy, payType, station, litres, amount, time,
        fills: fills || []
      });
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST bulk save entire month data
app.post('/api/fills/bulk', async (req, res) => {
  try {
    const { month, data } = req.body; // data = { vehicle: { date: {...} } }
    if (!month || !data) return res.status(400).json({ success: false, error: 'month and data required' });

    const year = month.split('-')[1];
    const ops  = [];

    Object.entries(data).forEach(([vehicle, dates]) => {
      Object.entries(dates).forEach(([date, info]) => {
        ops.push({
          updateOne: {
            filter: { vehicle, date, month },
            update: {
              $set: {
                vehicle, date, month, year,
                litres:  info.l || 0,
                amount:  info.a || 0,
                driver:  info.d || '',
                owner:   info.owner || '',
                paidBy:  info.p || '',
                payType: info.payType || '',
                station: info.station || '',
                time:    info.t || '',
                fills:   info.fills || [],
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        });
      });
    });

    await FuelFill.bulkWrite(ops);
    res.json({ success: true, saved: ops.length, month });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE a fill
app.delete('/api/fills/:vehicle/:month/:date', async (req, res) => {
  try {
    await FuelFill.deleteOne({
      vehicle: req.params.vehicle,
      month:   req.params.month,
      date:    req.params.date
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// ODOMETER ROUTES
// ═══════════════════════════════════════════════════════

// GET odometer for a vehicle (all entries)
app.get('/api/odometer/:vehicle', async (req, res) => {
  try {
    const entries = await Odometer.find({ vehicle: req.params.vehicle })
      .sort({ timestamp: 1 }).lean();
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET odometer for a vehicle + month
app.get('/api/odometer/:vehicle/:month', async (req, res) => {
  try {
    const entries = await Odometer.find({
      vehicle: req.params.vehicle,
      month:   req.params.month
    }).sort({ timestamp: 1 }).lean();
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save odometer reading
app.post('/api/odometer', async (req, res) => {
  try {
    const entry = await Odometer.create(req.body);
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE odometer entry
app.delete('/api/odometer/:id', async (req, res) => {
  try {
    await Odometer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// SCHEDULE CONFIG ROUTES
// ═══════════════════════════════════════════════════════

// GET all schedule configs
app.get('/api/schedule', async (req, res) => {
  try {
    const configs = await ScheduleConfig.find().lean();
    const result  = {};
    configs.forEach(c => { result[c.vehicle] = c; });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save schedule config for a vehicle
app.post('/api/schedule', async (req, res) => {
  try {
    const { vehicle, ...cfg } = req.body;
    const result = await ScheduleConfig.findOneAndUpdate(
      { vehicle },
      { vehicle, ...cfg, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST bulk save schedule configs
app.post('/api/schedule/bulk', async (req, res) => {
  try {
    const { configs } = req.body; // { vehicle: { interval, ltrsPerFill, ... } }
    const ops = Object.entries(configs).map(([vehicle, cfg]) => ({
      updateOne: {
        filter: { vehicle },
        update: { $set: { vehicle, ...cfg, updatedAt: new Date() } },
        upsert: true
      }
    }));
    await ScheduleConfig.bulkWrite(ops);
    res.json({ success: true, saved: ops.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// ESCALATION ROUTES
// ═══════════════════════════════════════════════════════

// GET all escalations
app.get('/api/escalations', async (req, res) => {
  try {
    const escs = await Escalation.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: escs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save escalation
app.post('/api/escalations', async (req, res) => {
  try {
    const esc = await Escalation.create(req.body);
    res.json({ success: true, data: esc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update escalation status
app.patch('/api/escalations/:id', async (req, res) => {
  try {
    const esc = await Escalation.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    res.json({ success: true, data: esc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE escalation
app.delete('/api/escalations/:id', async (req, res) => {
  try {
    await Escalation.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name:   'Sendo Fleet Tracker API',
    version:'1.0.0',
    endpoints: {
      fills:      'GET/POST /api/fills/:month  |  POST /api/fills/bulk  |  DELETE /api/fills/:vehicle/:month/:date',
      months:     'GET /api/months',
      odometer:   'GET/POST /api/odometer/:vehicle  |  DELETE /api/odometer/:id',
      schedule:   'GET/POST /api/schedule  |  POST /api/schedule/bulk',
      escalations:'GET/POST /api/escalations  |  PATCH/DELETE /api/escalations/:id'
    }
  });
});

module.exports = app;
