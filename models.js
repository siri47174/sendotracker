const mongoose = require('mongoose');

// ── FUEL FILL ──────────────────────────────────────────
const FuelFillSchema = new mongoose.Schema({
  vehicle:    { type: String, required: true, uppercase: true, trim: true },
  date:       { type: String, required: true },  // "01-Jan"
  month:      { type: String, required: true },  // "Jan-2026"
  year:       { type: String, required: true },  // "2026"
  driver:     { type: String, default: '' },
  owner:      { type: String, default: '' },
  paidBy:     { type: String, default: '' },
  payType:    { type: String, default: '' },     // OTP / Phone Pay / Cash / Card
  station:    { type: String, default: '' },
  litres:     { type: Number, default: 0 },
  amount:     { type: Number, default: 0 },
  time:       { type: String, default: '' },
  fills:      { type: Array,  default: [] },     // multiple fills same day
  createdAt:  { type: Date,   default: Date.now },
  updatedAt:  { type: Date,   default: Date.now },
});

FuelFillSchema.index({ vehicle: 1, date: 1, month: 1 }, { unique: false });
FuelFillSchema.index({ month: 1 });

// ── ODOMETER ───────────────────────────────────────────
const OdometerSchema = new mongoose.Schema({
  vehicle:    { type: String, required: true, uppercase: true },
  date:       { type: String, required: true },  // "01-Jan"
  month:      { type: String, required: true },  // "Jan-2026"
  closingKm:  { type: Number, required: true },
  openingKm:  { type: Number, default: null },
  totalKm:    { type: Number, default: null },
  litres:     { type: Number, default: null },   // fill litres at time of entry
  scheduledKm:{ type: Number, default: null },   // expected KM
  actualKmL:  { type: Number, default: null },   // actual KM/L
  difference: { type: Number, default: null },   // actual - expected
  timestamp:  { type: Date,   default: Date.now },
});

OdometerSchema.index({ vehicle: 1, date: 1 });
OdometerSchema.index({ vehicle: 1, month: 1 });

// ── SCHEDULE CONFIG ────────────────────────────────────
const ScheduleConfigSchema = new mongoose.Schema({
  vehicle:      { type: String, required: true, unique: true, uppercase: true },
  interval:     { type: Number, default: null },  // days
  ltrsPerFill:  { type: Number, default: null },
  kmPerLitre:   { type: Number, default: null },
  kmPerFill:    { type: Number, default: null },
  kmActual:     { type: Number, default: null },
  updatedAt:    { type: Date,   default: Date.now },
});

// ── ESCALATION ─────────────────────────────────────────
const EscalationSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  vehicle:     { type: String, required: true },
  date:        { type: String, required: true },
  tags:        { type: [String], default: [] },
  description: { type: String, default: '' },
  status:      { type: String, default: 'open' },  // open / resolved
  createdAt:   { type: Date, default: Date.now },
});

module.exports = {
  FuelFill:       mongoose.model('FuelFill',       FuelFillSchema),
  Odometer:       mongoose.model('Odometer',       OdometerSchema),
  ScheduleConfig: mongoose.model('ScheduleConfig', ScheduleConfigSchema),
  Escalation:     mongoose.model('Escalation',     EscalationSchema),
};
