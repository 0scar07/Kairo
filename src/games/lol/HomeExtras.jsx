import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { Card, SectionLabel, Notice, Skeleton } from "../../components/ui";
import { getRotation, getStatus } from "./api";
import { championByKey, championIcon } from "../../api/ddragon";
import { colors, radii, sizes, spacing, type } from "../../theme";

// Servidores: si hay mantenimientos o incidencias activas se avisa arriba (máx. 2 títulos)
function StatusNotice({ status }) {
  const items = [...(status?.maintenances || []), ...(status?.incidents || [])].filter(i => i.title).slice(0, 2);
  if (!items.length) return null;
  return (
    <Notice tone="warn" icon="tool">
      {status.name}: {items.map(i => i.title).join(" · ")}
    </Notice>
  );
}

// Rotación semanal gratuita
function RotationCard({ rotation }) {
  const champs = (rotation?.free || []).map(championByKey).filter(Boolean);
  if (!champs.length) return null;
  return (
    <Card>
      <SectionLabel>Rotación gratuita de la semana</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {champs.map(c => (
          <View key={c.id} style={styles.champ}>
            <Image source={{ uri: championIcon(c.name) }} style={styles.img} />
            <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

// Extras de LoL en Inicio: estado del servidor de la región y rotación semanal. Son opcionales:
// si no cargan simplemente no se muestran.
export default function LolHomeExtras({ region }) {
  const [data, setData] = useState({ status: null, rotation: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    setData(d => ({ ...d, loading: true }));
    Promise.all([
      getStatus(region).catch(e => { console.warn("Estado del servidor no disponible:", e.message); return null; }),
      getRotation(region).catch(e => { console.warn("Rotación gratuita no disponible:", e.message); return null; }),
    ]).then(([status, rotation]) => { if (!cancelled) setData({ status, rotation, loading: false }); });
    return () => { cancelled = true; };
  }, [region]);

  if (data.loading && !data.rotation) return <Skeleton height={sizes.iconHero} radius={radii.lg} style={styles.skeleton} />;

  return (
    <View>
      <StatusNotice status={data.status} />
      <RotationCard rotation={data.rotation} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { marginBottom: spacing.lg },
  champ:    { alignItems: "center", marginRight: spacing.md, width: sizes.avatarXl },
  img:      { width: sizes.avatarLg + spacing.sm, height: sizes.avatarLg + spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  name:     { ...type.micro, color: colors.textSecondary, marginTop: spacing.xs },
});
