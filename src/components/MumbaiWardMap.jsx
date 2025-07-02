import { useEffect, useState, useMemo } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import Papa from "papaparse";
import "leaflet/dist/leaflet.css";
import "../index.css";

import { YEARS, SHEET_CONFIG } from "../utils/constants";
import {
  defaultWardColor,
  getPartyColor,
  getPartyLogo,
  clearColorCache,
} from "../utils/colors";

function SetMapBounds({ geoData }) {
  const map = useMap();
  useEffect(() => {
    if (geoData) {
      const bounds = [];
      geoData.features.forEach((feature) => {
        const coords = feature.geometry.coordinates;
        const type = feature.geometry.type;
        if (type === "Polygon") {
          bounds.push(...coords[0].map(([lng, lat]) => [lat, lng]));
        } else if (type === "MultiPolygon") {
          coords.forEach((poly) =>
            bounds.push(...poly[0].map(([lng, lat]) => [lat, lng]))
          );
        }
      });
      if (bounds.length > 0) map.fitBounds(bounds);
    }
  }, [geoData, map]);
  return null;
}

const geoStyle = {
  color: "black",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.7,
};

const isTouchDevice = () =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

export default function MumbaiWardMap() {
  const [geoData, setGeoData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2017");
  const [partySeats, setPartySeats] = useState({});

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setGeoData(null);
      clearColorCache();

      try {
        const geoRes = await fetch(`/data/bmc_${selectedYear}_cleaned.geojson`);
        const geojson = await geoRes.json();

        const { sheetId, gid } = SHEET_CONFIG[selectedYear];
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        const attrRes = await fetch(sheetUrl);
        const csvText = await attrRes.text();
        const parsed = Papa.parse(csvText, { header: true });
        const attributes = parsed.data;

        geojson.features.forEach((feature) => {
          const wardId =
            feature.properties?.ward_number || feature.properties?.name;
          const match = attributes.find(
            (attr) =>
              attr.ward_number === wardId ||
              attr.name === wardId ||
              attr.ward_number === Number(wardId)
          );
          feature.properties = match || {};
        });

        if (!isMounted) return;

        setGeoData(geojson);

        const counts = {};
        geojson.features.forEach((f) => {
          const party = f.properties?.Party || "Unknown";
          counts[party] = (counts[party] || 0) + 1;
        });
        setPartySeats(counts);
      } catch (err) {
        console.error("❌ Error loading data:", err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const name = props?.name || "Unknown";
    const ward_number = props?.ward_number || "N/A";
    const candidate = props?.["Candidate Name"] || "N/A";
    const party = props?.Party || "Unknown";
    const areas = props?.Areas || "N/A";
    const logoUrl = getPartyLogo(party);
    const wardId = ward_number || name;
    const partyColor = getPartyColor(party, wardId);

    const infoHTML = `
  <div class="popup-content">
    <img src="${logoUrl}" alt="${party}" class="party-logo-top" />
    <strong>Name:</strong> ${name}<br/>
    <strong>Ward:</strong> ${ward_number}<br/>
    <strong>Candidate:</strong> <span class="bmc-areas-text">${candidate}</span><br/>
    <strong>Party:</strong> ${party}<br/>
    <strong>Areas:</strong> <span class="bmc-areas-text">${areas}</span>
  </div>
`;

    if (!isTouchDevice()) {
      layer.bindTooltip(infoHTML, {
        direction: "top",
        className: "district-tooltip",
      });
    } else {
      layer.bindPopup(infoHTML, { className: "custom-ward-popup" });
      layer.on("popupopen", (e) =>
        e.target.setStyle({ ...geoStyle, fillColor: partyColor })
      );
      layer.on("popupclose", (e) =>
        e.target.setStyle({ ...geoStyle, fillColor: defaultWardColor })
      );
    }

    layer.on({
      mouseover: (e) =>
        !isTouchDevice() &&
        e.target.setStyle({ ...geoStyle, fillColor: partyColor }),
      mouseout: (e) =>
        e.target.setStyle({ ...geoStyle, fillColor: defaultWardColor }),
    });
  };

  const geoJsonLayer = useMemo(() => {
    if (!geoData) return null;
    return (
      <GeoJSON
        key={selectedYear}
        data={geoData}
        style={() => ({ ...geoStyle, fillColor: defaultWardColor })}
        onEachFeature={onEachFeature}
      />
    );
  }, [geoData, selectedYear]);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* Gradients */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient
            id="congressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="30%" stopColor="#EE5A1C" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#166A2F" />
          </linearGradient>
          <linearGradient id="SPGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FE0000" />
            <stop offset="100%" stopColor="#018B00" />
          </linearGradient>
          <linearGradient id="BJPGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="20%" stopColor="#278D27" />
            <stop offset="100%" stopColor="#F97D09" />
          </linearGradient>
          <linearGradient id="MNSGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="30%" stopColor="#2d3192" />
            <stop offset="50%" stopColor="#f58322" />
            <stop offset="100%" stopColor="#00a650" />
          </linearGradient>
        </defs>
      </svg>

      <MapContainer
        center={[19.076, 72.8777]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
      >
        {geoJsonLayer}
        {geoData && <SetMapBounds geoData={geoData} />}
      </MapContainer>

      <div className="year-selector">
        <div className="year-title">Select the year</div>
        <select
          className="year-dropdown"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar">
        <h3>Seats by Party ({selectedYear})</h3>
        <table className="party-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Seats</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(partySeats).map(([party, seats]) => (
              <tr key={party}>
                <td>{party}</td>
                <td>{seats}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
