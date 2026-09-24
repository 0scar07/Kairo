// Regiones (plataformas de Riot) disponibles en la búsqueda
export const REGIONS = [
  { id: "la1",  label: "LAN",  name: "Latinoamérica Norte" },
  { id: "la2",  label: "LAS",  name: "Latinoamérica Sur" },
  { id: "na1",  label: "NA",   name: "Norteamérica" },
  { id: "br1",  label: "BR",   name: "Brasil" },
  { id: "euw1", label: "EUW",  name: "Europa Oeste" },
  { id: "eun1", label: "EUNE", name: "Europa Nórdica y Este" },
  { id: "tr1",  label: "TR",   name: "Turquía" },
  { id: "kr",   label: "KR",   name: "Corea" },
  { id: "jp1",  label: "JP",   name: "Japón" },
  { id: "oc1",  label: "OCE",  name: "Oceanía" },
];

export const DEFAULT_REGION = "la1";

export const getRegion = id => REGIONS.find(r => r.id === id) || REGIONS[0];
