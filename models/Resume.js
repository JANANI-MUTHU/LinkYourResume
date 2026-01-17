const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  username: { type: String, required: true },
  resumeUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  originalName: { type: String, required: true },
  views: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Resume", resumeSchema);
