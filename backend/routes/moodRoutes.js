
import express from "express";
import Mood from "../models/Mood.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

// Save detected mood
router.post("/", requireAuth, async (req, res) => {
  try {
    const { emotion, query, mode, source } = req.body;

    if (!emotion) {
      return res.status(400).json({
        success: false,
        message: "Emotion is required",
      });
    }

    const mood = await Mood.create({
      user: req.user._id,
      emotion,
      query,
      mode,
      source,
    });

    res.status(201).json({
      success: true,
      message: "Mood saved successfully",
      mood,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Get mood history for last 7 days
router.get("/week", requireAuth, async (req, res) => {
  try {
    const tz = req.query.tz || "UTC";

    // Validate timezone
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid timezone",
      });
    }

    const now = new Date();

    const dateKey = (date) => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);

      const get = (type) =>
        parts.find((p) => p.type === type).value;

      return `${get("year")}-${get("month")}-${get("day")}`;
    };

    // Generate last 7 calendar dates
    const today = dateKey(now);
    const [year, month, day] = today.split("-").map(Number);

    const dateList = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1, day - i));
      return d.toISOString().slice(0, 10);
    }).reverse();

    const validDates = new Set(dateList);

    // Fetch recent records belonging to logged-in user
    const moods = await Mood.find({
  user: req.user._id,
  createdAt: {
    $gte: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
  },
}).sort({ createdAt: -1 });

    const weekMoods = moods.filter((mood) =>
      validDates.has(dateKey(mood.createdAt))
    );

    const totals = {};
    const dailyCounts = {};

    dateList.forEach((date) => {
      dailyCounts[date] = {};
    });

    weekMoods.forEach((mood) => {
      const emotion = mood.emotion;
      const date = dateKey(mood.createdAt);

      totals[emotion] = (totals[emotion] || 0) + 1;
      dailyCounts[date][emotion] =
        (dailyCounts[date][emotion] || 0) + 1;
    });

    const days = dateList.map((date) => {
      const counts = dailyCounts[date];
      const total = Object.values(counts).reduce(
        (sum, count) => sum + count, 0
      );

      return {
        date,
        label: new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          weekday: "short",
        }).format(new Date(date + "T12:00:00Z")),
        counts,
        total,
      };
    });

    const maxDay = Math.max(1, ...days.map((d) => d.total));

    const topEmotion = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    const recent = weekMoods.slice(0, 20).map((mood) => ({
      id: mood._id,
      emotion: mood.emotion,
      query: mood.query,
      mode: mood.mode,
      source: mood.source,
      createdAt: mood.createdAt,
    }));

    res.status(200).json({
      success: true,
      total: weekMoods.length,
      topEmotion,
      days,
      totals,
      maxDay,
      recent,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Delete mood record
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const mood = await Mood.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!mood) {
      return res.status(404).json({
        success: false,
        message: "Mood not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Mood deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// Add this to backend/routes/moodRoutes.js, ABOVE `export default router;`
// Clears the logged-in user's whole mood history (used by the "Clear all" button).
router.delete("/", requireAuth, async (req, res) => {
  try {
    const result = await Mood.deleteMany({ user: req.user.sub });
    res.status(200).json({
      success: true,
      message: "Mood history cleared",
      deleted: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
