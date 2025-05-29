import { useEffect, useState } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";

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

      map.fitBounds(bounds);
    }
  }, [geoData, map]);

  return null;
}

export default function MumbaiWardMap() {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch("/data/mumbai.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error fetching GeoJSON:", err));
  }, []);

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.name || "Unknown Ward";

    layer.bindTooltip(name, {
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
          fillColor: getFillColor(feature.properties.population),
        });
      },
    });

    layer.on("click", (event) => {
      event.originalEvent.preventDefault();
      event.target.closeTooltip();
    });
  };

  return (
    <MapContainer
      center={[19.0760, 72.8777]}
      zoom={11}
      style={{ height: "100vh", width: "100%", background: "#f4f4f4" }}
    >
      {geoData && (
        <>
          <GeoJSON
            data={geoData}
            style={(feature) => ({
              ...geoStyle,
              fillColor: getFillColor(feature.properties.population),
            })}
            onEachFeature={onEachFeature}
          />
          <SetMapBounds geoData={geoData} />
        </>
      )}
    </MapContainer>
  );
}