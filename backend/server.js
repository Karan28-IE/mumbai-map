const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());

// API route to return GeoJSON and attribute data by year
app.get("/api/geojson/:year", (req, res) => {
  const year = req.params.year;

  const geojsonPath = path.join(__dirname, "..", "public", "data", `bmc_${year}_cleaned.geojson`);
  const attributesPath = path.join(__dirname, "..", "public", "data", `bmc_${year}_attributes.json`);

  try {
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"));
    const attributes = JSON.parse(fs.readFileSync(attributesPath, "utf-8"));

    res.json({ geojson, attributes });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: `Failed to load files for year ${year}`,
      details: err.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Node server is running at http://localhost:${PORT}`);
});
