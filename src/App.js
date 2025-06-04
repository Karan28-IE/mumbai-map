import { useEffect, useState, useMemo } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";

const YEARS = ["2019", "2014", "2009"];

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

export default function MumbaiWardMap() {
  const [geoData, setGeoData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2019");

  useEffect(() => {
    setGeoData(null);
    fetch(`/data/bmc_${selectedYear}.geojson`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Loaded data for year:", selectedYear);
        setGeoData(data);
      })
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, [selectedYear]);

  const onEachFeature = (feature, layer) => {
    const name = feature.properties?.name || "Unknown Ward";
    const winner = feature.properties?.winner || "No Data";

    layer.bindTooltip(`${name} - Winner: ${winner}`, {
      permanent: false,
      direction: "top",
      className: "district-tooltip",
    });

    layer.on({
      mouseover: (event) => {
        event.target.setStyle({ fillColor: "#ff8000", fillOpacity: 0.8 });
      },
      mouseout: (event) => {
        event.target.setStyle({
          ...geoStyle,
          fillColor: getFillColor(feature.properties?.population ?? 0),
        });
      },
    });

    layer.on("click", (event) => {
      event.originalEvent.preventDefault();
      event.target.closeTooltip();
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
        zoom={11}
        style={{ height: "100%", width: "100%", background: "#f4f4f4" }}
      >
        {geoJsonLayer}
        {geoData && <SetMapBounds geoData={geoData} />}
      </MapContainer>

      {
        
      }
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "70%",
          transform: "translateX(-50%)",
          background: "rgba(0, 0, 0, 0.6)",
          padding: "12px 16px",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1000,
          textTransform:"capitalize",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          Select the year for Mumbai election
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {YEARS.map((year) => (
            <button
              key={year}
              style={{
                padding: "6px 12px",
                background: year === selectedYear ? "#16579d" : "#ccc",
                color: year === selectedYear ? "#fff" : "#000",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
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
