export const defaultWardColor = "#FFF";

export const partyColors = {
  BJP: "#FF9933",
  Shivsena: "#FFD700",
  ShivSena: "#FF6634",
  NCP: "#9400D3",
  MNS: "#DC143C",
  AAP: "#6EC6CA",
  Independent: "#C0C0C0",
  Unknown: "#a0a0a0",
};

export const gradientParties = {
  INC: "congressGradient",
  Congress: "congressGradient",
  SP: "SPGradient",
  BJP: "BJPGradient",
  MNS: "MNSGradient",
};

export const partyLogos = {
  BJP: "/logos/bjp.png",
  INC: "/logos/inc.png",
  Congress: "/logos/Congress.png",
  NCP: "/logos/ncp.png",
  MNS: "/logos/mns.png",
  ShivSena: "/logos/ShivSena.png",
  Shivsena: "/logos/ShivSena.png",
  SHS: "/logos/shs.png",
  SS: "/logos/ss.png",
  SP: "/logos/sp.png",
};

const colorCache = new Map();

export const getPartyColor = (party, wardId) => {
  if (gradientParties[party]) return `url(#${gradientParties[party]})`;
  const key = `${party}_${wardId}`;
  if (colorCache.has(key)) return colorCache.get(key);
  const color = partyColors[party] || "#cccccc";
  colorCache.set(key, color);
  return color;
};

export const getPartyLogo = (party) => partyLogos[party] || partyLogos["Unknown"];

export const clearColorCache = () => colorCache.clear();
