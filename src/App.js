import { useEffect, useState, useMemo } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";

const YEARS = ["2017", "2012", "2007"];

const geoStyle = {
  color: "black",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.7,
};

const defaultWardColor = "#e0e0e0";

const partyColors = {
  BJP: "#FF9933",
  Shivsena: "#FFD700",
  ShivSena: "#FF6634",
  NCP: "#9400D3",
  MNS: "#DC143C",
  AAP: "#6EC6CA",
  Independent: "#C0C0C0",
  Unknown: "#a0a0a0",
};

const gradientParties = {
  INC: "congressGradient",
  Congress: "congressGradient",
  SP: "SPGradient",
  BJP: "BJPGradient",
  MNS: "MNSGradient",
};

const partyLogos = {
  BJP: "/logos/bjp.png",
  INC: "/logos/inc.png",
  Congress: "/logos/Congress.png",
  NCP: "/logos/ncp.png",
  MNS: "/logos/mns.png",
  ShivSena: "/logos/ShivSena.png",
  Shivsena: "/logos/ShivSena.png",
  SP: "/logos/sp.png",
};

const colorCache = new Map();

const getPartyColor = (party, wardId) => {
  if (gradientParties[party]) {
    return `url(#${gradientParties[party]})`;
  }
  const key = `${party}_${wardId}`;
  if (colorCache.has(key)) return colorCache.get(key);
  const color = partyColors[party] || "#cccccc";
  colorCache.set(key, color);
  return color;
};

const getPartyLogo = (party) => partyLogos[party] || partyLogos["Unknown"];

function SetMapBounds({ geoData }) {
  const map = useMap();
  useEffect(() => {
    if (geoData) {
      const bounds = [];
      geoData.features.forEach((feature) => {
        const coords = feature.geometry.coordinates;
        const geomType = feature.geometry.type;
        if (geomType === "Polygon") {
          bounds.push(...coords[0].map(([lng, lat]) => [lat, lng]));
        } else if (geomType === "MultiPolygon") {
          coords.forEach((polygon) =>
            bounds.push(...polygon[0].map(([lng, lat]) => [lat, lng]))
          );
        }
      });
      if (bounds.length > 0) {
        map.fitBounds(bounds);
      }
    }
  }, [geoData, map]);
  return null;
}

const isTouchDevice = () =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

export default function MumbaiWardMap() {
  const [geoData, setGeoData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2017");
  const [partySeats, setPartySeats] = useState({});

  useEffect(() => {
  let isMounted = true;
  let loading = false;
  let intervalId;

  const fetchData = () => {
    if (loading) return; // prevent overlapping
    loading = true;

    setGeoData(null);
    colorCache.clear();

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
    fetch(`${API_BASE_URL}/api/geojson/${selectedYear}`)
      .then((res) => res.json())
      .then(({ geojson, attributes }) => {
        if (!isMounted) return;

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

        setGeoData(geojson);

        const counts = {};
        geojson.features.forEach((feature) => {
          const party = feature.properties?.Party || "Unknown";
          counts[party] = (counts[party] || 0) + 1;
        });
        setPartySeats(counts);
      })
      .catch((err) => console.error("Error loading data:", err))
      .finally(() => {
        loading = false;
      });
  };

  fetchData(); // load first time

  intervalId = setInterval(() => {
    if (!loading) {
      fetchData();
    }
  }, 15000);

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
}, [selectedYear]);



  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const name = props?.name || "Unknown Ward";
    const ward_number = props?.ward_number || "N/A";
    const candidate = props?.["Candidate Name"] || "N/A";
    const party = props?.Party || "Unknown";
    const areas = props?.Areas || "N/A";
    const logoUrl = getPartyLogo(party);
    const wardId = ward_number || name;
    const partyColor = getPartyColor(party, wardId);

    const infoHTML = `
      <div style="text-align: left;">
        <strong>Name:</strong> ${name}<br/>
        <strong>Ward:</strong> ${ward_number}<br/>
        <strong>Candidate:</strong> ${candidate}<br/>
        <strong>Party:</strong> ${party}<br/>
        <img src="${logoUrl}" alt="${party} logo" style="width: 40px; height: 40px; margin: 5px 0; border-radius: 50%; border: 1px solid #ccc;" /><br/>
        <strong>Areas:</strong> ${areas}
      </div>
    `;

    if (!isTouchDevice()) {
      layer.bindTooltip(infoHTML, {
        permanent: false,
        direction: "top",
        className: "district-tooltip",
      });
    } else {
      layer.bindPopup(infoHTML, {
        className: "custom-ward-popup",
      });

      layer.on("popupopen", (event) => {
        event.target.setStyle({
          ...geoStyle,
          fillColor: partyColor,
        });
      });

      layer.on("popupclose", (event) => {
        event.target.setStyle({
          ...geoStyle,
          fillColor: defaultWardColor,
        });
      });
    }

    layer.on({
      mouseover: (event) => {
        if (!isTouchDevice()) {
          event.target.setStyle({
            ...geoStyle,
            fillColor: partyColor,
          });
        }
      },
      mouseout: (event) => {
        event.target.setStyle({
          ...geoStyle,
          fillColor: defaultWardColor,
        });
      },
    });
  };

  const geoJsonLayer = useMemo(() => {
    if (!geoData) return null;

    return (
      <GeoJSON
        key={selectedYear}
        data={geoData}
        style={() => ({
          ...geoStyle,
          fillColor: defaultWardColor,
        })}
        onEachFeature={onEachFeature}
      />
    );
  }, [geoData, selectedYear]);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <svg style={{position: "absolute",width: 0,height: 0,overflow: "hidden",pointerEvents: "none",}}
      aria-hidden="true"
      focusable="false"
      >
        <defs>
          <linearGradient id="congressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
        style={{ height: "100%", width: "100%", background: "#f4f4f4" }}
      >
        {geoJsonLayer}
        {geoData && <SetMapBounds geoData={geoData} />}
      </MapContainer>

      <div className="year-selector">
        <div className="year-title">Select the year for Mumbai election</div>
        <div className="year-buttons">
          {YEARS.map((year) => (
            <button
              key={year}
              className={`year-button ${year === selectedYear ? "active" : ""}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar">
        <h3 className="map-party-title">Seats by Party ({selectedYear})</h3>
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
