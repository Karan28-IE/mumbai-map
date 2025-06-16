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

const getFillColor = (population) => {
  if (population > 1000000) return "#FF8C00";
  if (population > 500000) return "#FFA07A";
  return "#5092a5";
};

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

  useEffect(() => {
    setGeoData(null);
    fetch(`/data/bmc_${selectedYear}.geojson`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setGeoData(data);
      })
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, [selectedYear]);

  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const name = props?.name || "Unknown Ward";
    const ward = props?.Ward || "N/A";
    const candidate = props?.["Candidate Name"] || "N/A";
    const party = props?.Party || "N/A";
    const areas = props?.Areas || "N/A";

    const infoHTML = `
      <div style="text-align: left;">
        <strong>Name:</strong> ${name}<br/>
        <strong>Ward:</strong> ${ward}<br/>
        <strong>Candidate:</strong> ${candidate}<br/>
        <strong>Party:</strong> ${party}<br/>
        <strong>Areas:</strong> ${areas}
      </div>
    `;

    const originalColor = getFillColor(props?.population ?? 0);

    if (!isTouchDevice()) {
      layer.bindTooltip(infoHTML, {
        permanent: false,
        direction: "top",
        className: "district-tooltip",
      });
    } else {
      layer.bindPopup(infoHTML, {
        className: "custom-ward-popup" 
      });

      layer.on("popupopen", (event) => {
        event.target.setStyle({
          ...geoStyle,
          fillColor: "#fa3a00",
        });
      });

      layer.on("popupclose", (event) => {
        event.target.setStyle({
          ...geoStyle,
          fillColor: originalColor,
        });
      });
    }

    layer.on({
      mouseover: (event) => {
        if (!isTouchDevice()) {
          event.target.setStyle({ fillColor: "#ff8000", fillOpacity: 0.8 });
        }
      },
      mouseout: (event) => {
        event.target.setStyle({
          ...geoStyle,
          fillColor: originalColor,
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
        style={(feature) => ({
          ...geoStyle,
          fillColor: getFillColor(feature.properties?.population ?? 0),
        })}
        onEachFeature={onEachFeature}
      />
    );
  }, [geoData, selectedYear]);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <MapContainer
        center={[19.076, 72.8777]}
        zoom={9}
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
              className={`year-button ${
                year === selectedYear ? "active" : ""
              }`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}