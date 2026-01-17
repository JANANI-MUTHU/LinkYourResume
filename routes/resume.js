const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Resume = require("../models/Resume");

const router = express.Router();

/* Cloudinary config */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* Multer: memory storage */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* Upload Resume */
router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file || !req.body.username) {
      return res.status(400).json({ error: "Username and resume required" });
    }

    /* Generate unique public_id */
    const timestamp = Date.now();
    const sanitizedUsername = req.body.username.replace(/[^a-zA-Z0-9]/g, '_');
    const publicId = `resumes/${sanitizedUsername}_${timestamp}`;

    /* Upload buffer directly to Cloudinary */
    const cloudinaryUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
            public_id: publicId,
            type: "upload",
            invalidate: true
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await cloudinaryUpload();

    const resume = await Resume.create({
      username: req.body.username,
      resumeUrl: result.secure_url,
      publicId: result.public_id,
      originalName: req.file.originalname,
    });

    res.json({
      message: "Resume uploaded successfully",
      resumeId: resume._id,
      // Direct Cloudinary link - FULLY PUBLIC, works anywhere
      directLink: result.secure_url,
      // Backend tracking link - works globally with deployed backend
      trackingLink: `${process.env.BASE_URL || 'http://localhost:5000'}/resume/${resume._id}`,
      note: "Use directLink for instant access. Use trackingLink for view count tracking."
    });

  } catch (err) {
    console.error("UPLOAD ERROR 👉", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* Download Resume */
router.get("/:id", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // Increment view count
    resume.views += 1;
    await resume.save();

    // Redirect to Cloudinary URL (forces download with fl_attachment)
    const downloadUrl = resume.resumeUrl.replace('/upload/', '/upload/fl_attachment/');
    res.redirect(downloadUrl);

  } catch (err) {
    console.error("DOWNLOAD ERROR 👉", err);
    res.status(500).json({ error: "Failed to download resume" });
  }
});

/* Get Resume Stats */
router.get("/stats/:id", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id).select('-__v');
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.json({
      success: true,
      data: {
        username: resume.username,
        originalName: resume.originalName,
        views: resume.views,
        uploadedAt: resume.createdAt,
        publicUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/resume/${resume._id}`
      }
    });
  } catch (err) {
    console.error("STATS ERROR 👉", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
