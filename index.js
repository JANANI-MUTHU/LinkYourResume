require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const resumeRoutes = require("./routes/resume");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.use("/resume", resumeRoutes);

app.get("/", (req, res) => {
  res.json({ 
    message: "LinkYourResume API", 
    endpoints: {
      upload: "POST /resume/upload",
      download: "GET /resume/:id",
      stats: "GET /resume/stats/:id"
    }
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
