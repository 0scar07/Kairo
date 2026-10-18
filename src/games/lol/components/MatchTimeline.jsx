import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { ClipPath, Defs, Line, Path, Rect, G } from "react-native-svg";
import Mini from "./Mini";
import { Skeleton } from "../../../components/ui";
import { itemIcon } from "../../../api/ddragon";
import { getTimeline } from "../api";
import { useT } from "../../../i18n/I18nProvider";
import { colors, fontSizes, sizes, spacing, type, tracking, withAlpha } from "../../../theme";

const H = 96;
const cache = new Map();   // matchId -> promesa de la línea de tiempo (ya no cambia: la partida terminó)

const timelineOf = matchId => {
  if (!cache.has(matchId)) cache.set(matchId, getTimeline(matchId).catch(e => { cache.delete(matchId); throw e; }));
  return cache.get(matchId);
};

const signedK = n => `${n >= 0 ? "+" : "−"}${(Math.abs(n) / 1000).toFixed(1)}k`;

/**
 * Diferencia de oro minuto a minuto (tu equipo menos el rival: arriba en verde vas por delante) y el orden en que se
 * compraron los objetos de la build final, con su minuto. Sale de la línea de tiempo de Riot, que se pide al abrir la
 * partida; si no llega, esta parte no se muestra y el resto del detalle queda igual.
 */
export default function MatchTimeline({ match, myPuuid }) {
  const t = useT();
  const matchId = match?.metadata?.matchId;
  const [tl, setTl] = useState(null);   // null = cargando, false = sin datos
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!matchId) { setTl(false); return undefined; }
    let alive = true;
    timelineOf(matchId).then(d => { if (alive) setTl(d); }).catch(() => { if (alive) setTl(false); });
    return () => { alive = false; };
  }, [matchId]);

  if (tl === false) return null;

  const me = match.info.participants.find(p => p.puuid === myPuuid);
  const myTeam = me?.teamId ?? 100;

  let diff = [], build = [];
  if (tl) {
    const teamOf = (tl.puuids || []).map(id => match.info.participants.find(p => p.puuid === id)?.teamId);
    diff = (tl.frames || []).map(f => f.gold.reduce((sum, g, i) => sum + (teamOf[i] === myTeam ? g : teamOf[i] ? -g : 0), 0));
    // Build final (sin el abalorio) en el orden en que se compró cada objeto; los que no aparecen (mejoras automáticas) al final
    const myBuys = tl.buys?.[(tl.puuids || []).indexOf(myPuuid)] || [];
    const finals = [me?.item0, me?.item1, me?.item2, me?.item3, me?.item4, me?.item5].filter(Boolean);
    build = finals
      .map(id => ({ id, at: myBuys.find(([, item]) => item === id)?.[0] ?? null }))
      .sort((a, b) => (a.at ?? 999) - (b.at ?? 999));
  }

  const last = diff.length ? diff[diff.length - 1] : 0;
  const lim = Math.max(1000, ...diff.map(Math.abs)) * 1.1;
  const x = i => (diff.length > 1 ? (i / (diff.length - 1)) * width : 0);
  const y = v => H / 2 - (v / lim) * (H / 2 - spacing.xs);
  const line = diff.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${H / 2} L0 ${H / 2} Z`;
  const minutes = diff.length ? diff.length - 1 : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{t("match.goldDiff")}</Text>
        {tl ? <Text style={[styles.end, { color: last >= 0 ? colors.win : colors.loss }]}>{t("match.goldEnd", { value: signedK(last) })}</Text> : null}
      </View>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.chart} accessible accessibilityLabel={tl ? t("match.goldEnd", { value: signedK(last) }) : undefined}>
        {!tl || !width ? <Skeleton height={H} /> : (
          <Svg width={width} height={H}>
            <Defs>
              <ClipPath id="goldUp"><Rect x="0" y="0" width={width} height={H / 2} /></ClipPath>
              <ClipPath id="goldDown"><Rect x="0" y={H / 2} width={width} height={H / 2} /></ClipPath>
            </Defs>
            <Line x1="0" x2={width} y1={H / 2} y2={H / 2} stroke={colors.borderStrong} strokeDasharray="4 4" />
            <G clipPath="url(#goldUp)"><Path d={area} fill={withAlpha(colors.win, 0.24)} /></G>
            <G clipPath="url(#goldDown)"><Path d={area} fill={withAlpha(colors.loss, 0.28)} /></G>
            <Path d={line} stroke={colors.text} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        )}
      </View>
      {tl ? (
        <View style={styles.axis}>
          {[0, Math.round(minutes / 3), Math.round((minutes * 2) / 3), minutes].map((m, i) => <Text key={i} style={styles.tick}>{m}'</Text>)}
        </View>
      ) : null}

      {build.length ? (
        <>
          <Text style={[styles.label, styles.buildLabel]}>{t("match.buildOrder")}</Text>
          <View style={styles.build}>
            {build.map((b, i) => (
              <React.Fragment key={`${b.id}-${i}`}>
                {i > 0 ? <Text style={styles.arrow}>›</Text> : null}
                <View style={styles.item}>
                  <Mini uri={itemIcon(b.id)} size={sizes.avatarMd - spacing.xs} />
                  <Text style={styles.tick}>{b.at != null ? `${b.at}'` : " "}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:       { padding: spacing.md, borderBottomWidth: sizes.hairline, borderBottomColor: colors.border },
  head:       { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.sm },
  label:      { ...type.label, fontSize: fontSizes.xs, letterSpacing: tracking.wide, color: colors.textSecondary, textTransform: "uppercase" },
  end:        { ...type.smallStrong, fontVariant: ["tabular-nums"] },
  chart:      { height: H },
  axis:       { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xxs },
  tick:       { ...type.micro, color: colors.textMuted, fontVariant: ["tabular-nums"], textAlign: "center" },
  buildLabel: { marginTop: spacing.md, marginBottom: spacing.sm },
  build:      { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", rowGap: spacing.sm },
  item:       { alignItems: "center", gap: spacing.xxs },
  arrow:      { ...type.body, color: colors.textMuted, marginHorizontal: spacing.xs, marginTop: spacing.xs },
});
