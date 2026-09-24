import React from "react";
import ProfileView from "../components/ProfileView";

// Perfil de un jugador buscado: params { gameId, data }
export default function ProfileScreen({ route }) {
  const { gameId, data } = route.params;
  return <ProfileView gameId={gameId} initialData={data} />;
}
