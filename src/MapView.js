import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const MapView = () => {
  const [wardsData, setWardsData] = useState(null);

  useEffect(() => {
    fetch('/data/mumbai-wards.geojson')
      .then(res => res.json())
      .then(data => setWardsData(data));
  }, []);

  const onEachWard = (feature, layer) => {
    if (feature.properties) {
      layer.bindPopup(`<b>${feature.properties.ward_name}</b>`);
    }
  };

  return (
    <MapContainer center={[19.0760, 72.8777]} zoom={11} style={{ height: "100vh", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {wardsData && (
        <GeoJSON data={wardsData} onEachFeature={onEachWard} />
      )}
    </MapContainer>
  );
};

export default MapView;
