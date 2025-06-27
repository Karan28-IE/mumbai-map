const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const Papa = require("papaparse");

const app = express();
const PORT = 5000;

app.use(cors());

// Configure Sheet IDs and GIDs for each year
const SHEET_CONFIG = {
  "2017": {
    sheetId: "154yDS3Jho9BEcbvValXQoBwHJ85ES5g_496R9K2AbeA",
    gid: "1191731829",
  },
  // Add other years if needed
};

app.get("/api/geojson/:year", async (req, res) => {
  const year = req.params.year;

  const geojsonPath = path.join(
    __dirname,
    "backend",
    "public",
    "data",
    `bmc_${year}_cleaned.geojson`
  );

  const sheetConfig = SHEET_CONFIG[year];
  if (!sheetConfig) {
    return res.status(400).json({ error: `No sheet config for year ${year}` });
  }

  try {
    // Load GeoJSON from local file
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"));

    // Fetch CSV data from Google Sheets
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetConfig.sheetId}/export?format=csv&gid=${sheetConfig.gid}`;
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }
    const csvText = await response.text();

    // Parse CSV into JSON
    const parsed = Papa.parse(csvText, { header: true });
    const attributes = parsed.data;

    // Respond with both geojson and attributes
    res.json({ geojson, attributes });
  } catch (err) {
    console.error("❌ Error loading data:", err);
    res.status(500).json({
      error: `Failed to load data for year ${year}`,
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
