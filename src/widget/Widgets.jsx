import React from "react";
import { FlexWidget, ImageWidget, TextWidget } from "react-native-android-widget";
import { t } from "../i18n";
import { tierLabel } from "../utils/format";

/**
 * Los tres widgets de la pantalla de inicio de Android, con los colores de Kairo. Solo se cargan si el APK trae
 * react-native-android-widget (ver native.js). Tocar un widget abre su pantalla en la app (kairo://…).
 *  - KairoRank (4x2): rango Solo/Dúo, LP, lo ganado en la semana y las últimas 5 partidas
 *  - KairoMatch (2x2): el próximo partido de Valorant (o el que se está jugando)
 *  - KairoFriends (2x2): hasta 3 favoritos de LoL y si están en partida
 */
const C = {
  bg: "#070C0F", surface: "#0D141B", raised: "#131C26", high: "#1B2734", text: "#E6EDF6", text2: "#9AAABD", muted: "#8193A8",
  brand: "#35E0A1", gold: "#C89B3C", win: "#4FC97A", loss: "#E05555", val: "#FF4655", info: "#0BC4E3",
};
const TIER_COLORS = {
  IRON: "#8A8A8A", BRONZE: "#CD7F32", SILVER: "#A8A9AD", GOLD: "#FFD700", PLATINUM: "#00D4AA", EMERALD: "#50C878",
  DIAMOND: "#B9F2FF", MASTER: "#9B59B6", GRANDMASTER: "#E74C3C", CHALLENGER: "#F1C40F",
};
const EMBLEMS = {
  IRON: require("../../assets/ranks/iron.png"), BRONZE: require("../../assets/ranks/bronze.png"), SILVER: require("../../assets/ranks/silver.png"),
  GOLD: require("../../assets/ranks/gold.png"), PLATINUM: require("../../assets/ranks/platinum.png"), EMERALD: require("../../assets/ranks/emerald.png"),
  DIAMOND: require("../../assets/ranks/diamond.png"), MASTER: require("../../assets/ranks/master.png"), GRANDMASTER: require("../../assets/ranks/grandmaster.png"),
  CHALLENGER: require("../../assets/ranks/challenger.png"),
};
const HEAD = { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.6 };

const card = gradient => ({
  height: "match_parent", width: "match_parent", borderRadius: 24, padding: 14,
  backgroundGradient: { from: gradient, to: C.bg, orientation: "TL_BR" },
  borderWidth: 1, borderColor: "#1C2733",
});

function Header({ color, label, right }) {
  return (
    <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent" }}>
      <FlexWidget style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: color, marginRight: 7 }} />
      <TextWidget text={label} style={{ ...HEAD, color: C.text2 }} />
      <FlexWidget style={{ flex: 1 }} />
      {right ? <TextWidget text={right} style={{ ...HEAD, fontFamily: "Inter_600SemiBold", color: C.muted }} /> : null}
    </FlexWidget>
  );
}

const ago = at => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  return m < 60 ? t("widget.minAgo", { n: m }) : m < 1440 ? t("widget.hAgo", { n: Math.round(m / 60) }) : t("widget.dAgo", { n: Math.round(m / 1440) });
};

/** Rango Solo/Dúo de Mi perfil */
export function RankWidget({ data, width = 320 }) {
  if (!data) {
    return (
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "kairo://perfil" }} style={{ ...card("#1A1406"), justifyContent: "center" }}>
        <Header color={C.brand} label="KAIRO" />
        <TextWidget text={t("widget.rankEmpty")} style={{ fontFamily: "Sora_800ExtraBold", fontSize: 18, color: C.text, marginTop: 10 }} />
        <TextWidget text={t("widget.rankEmptyHint")} style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.text2, marginTop: 4 }} />
      </FlexWidget>
    );
  }
  const tint = TIER_COLORS[data.tier] || C.gold;
  const apex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(data.tier);
  const tierText = data.tier ? tierLabel(data.tier, data.rank) : t("ranked.unranked");
  const barW = Math.max(width - 28 - 86, 80);
  const pct = apex ? 1 : Math.min(Math.max((data.lp || 0) / 100, 0), 1);
  const week = data.weekLp == null ? null : `${data.weekLp > 0 ? "+" : ""}${data.weekLp} ${t("widget.thisWeek")}`;
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "kairo://perfil" }} style={card("#1A1406")}>
      <Header color={C.brand} label={`KAIRO · ${t("ranked.solo").toUpperCase()}`} right={ago(data.at)} />
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent", marginTop: 10 }}>
        {data.tier ? <ImageWidget image={EMBLEMS[data.tier]} imageWidth={64} imageHeight={64} style={{ marginRight: 12 }} /> : null}
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text={tierText} style={{ fontFamily: "Sora_800ExtraBold", fontSize: 22, color: tint }} maxLines={1} truncate="END" />
          <FlexWidget style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <TextWidget text={`${data.lp ?? 0} LP`} style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: C.text }} />
            {week ? <TextWidget text={`  ·  ${week}`} style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: data.weekLp >= 0 ? C.win : C.loss }} /> : null}
          </FlexWidget>
          <FlexWidget style={{ width: barW, height: 7, borderRadius: 4, backgroundColor: C.high, marginTop: 8 }}>
            <FlexWidget style={{ width: Math.max(Math.round(barW * pct), 6), height: 7, borderRadius: 4, backgroundGradient: { from: "#B07F22", to: "#E6B85A", orientation: "LEFT_RIGHT" } }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent", marginTop: 12 }}>
        {(data.last5 || []).map((win, i) => (
          <FlexWidget key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 5, backgroundColor: win ? "#173A26" : "#3A1717", borderWidth: 1, borderColor: win ? "#2E7A4C" : "#7A2E2E" }}>
            <TextWidget text={win ? t("widget.w") : t("widget.l")} style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: win ? C.win : C.loss }} />
          </FlexWidget>
        ))}
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text={data.last5?.length ? t("widget.last5") : `${data.name}`} style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.muted }} />
      </FlexWidget>
    </FlexWidget>
  );
}

const until = iso => {
  const m = Math.round((Date.parse(iso) - Date.now()) / 60000);
  if (!(m > 0)) return t("widget.startingNow");
  if (m < 60) return t("widget.inMin", { n: m });
  if (m < 1440) return t("widget.inHours", { h: Math.floor(m / 60), m: String(m % 60).padStart(2, "0") });
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
};

/** Próximo partido de Valorant */
export function MatchWidget({ match }) {
  if (!match) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...card("#2A0D12"), justifyContent: "center" }}>
        <Header color={C.val} label="VALORANT" />
        <TextWidget text={t("widget.noMatch")} style={{ fontFamily: "Sora_800ExtraBold", fontSize: 15, color: C.text, marginTop: 10 }} />
      </FlexWidget>
    );
  }
  const [a, b] = match.teams;
  const name = tm => tm?.acronym || tm?.name || "TBD";
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: `kairo://valorant/partido/${match.id}` }} style={card("#2A0D12")}>
      <Header color={C.val} label="VAL" right={match.live ? t("wr.live") : match.followed ? "★" : null} />
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "match_parent", marginTop: 12 }}>
        <TextWidget text={name(a)} style={{ fontFamily: "Sora_800ExtraBold", fontSize: 16, color: C.text }} maxLines={1} />
        <TextWidget text="  vs  " style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.muted }} />
        <TextWidget text={name(b)} style={{ fontFamily: "Sora_800ExtraBold", fontSize: 16, color: C.info }} maxLines={1} />
      </FlexWidget>
      <TextWidget
        text={match.live ? `${a?.score ?? 0} : ${b?.score ?? 0}` : until(match.beginAt)}
        style={{ fontFamily: "Sora_800ExtraBold", fontSize: 22, color: match.live ? C.val : C.text, textAlign: "center", width: "match_parent", marginTop: 6 }}
      />
      <TextWidget text={match.event} style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.muted, textAlign: "center", width: "match_parent", marginTop: 2 }} maxLines={1} truncate="END" />
    </FlexWidget>
  );
}

/** Favoritos de LoL en partida */
export function FriendsWidget({ friends, dd }) {
  const icon = id => `${dd || "https://ddragon.leagueoflegends.com/cdn/16.20.1"}/img/profileicon/${id ?? 29}.png`;
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: "kairo://favoritos" }} style={card("#1A1406")}>
      <Header color={C.gold} label={t("widget.friends").toUpperCase()} />
      {friends.length ? friends.map((f, i) => (
        <FlexWidget key={i} style={{ flexDirection: "row", alignItems: "center", width: "match_parent", marginTop: i ? 8 : 12 }}>
          <ImageWidget image={icon(f.iconId)} imageWidth={30} imageHeight={30} radius={15} style={{ marginRight: 9 }} />
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget text={f.name} style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: C.text }} maxLines={1} truncate="END" />
            <TextWidget text={f.inGame ? `● ${t("widget.inGame")}` : t("widget.notInGame")} style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: f.inGame ? C.loss : C.muted }} />
          </FlexWidget>
        </FlexWidget>
      )) : <TextWidget text={t("widget.noFriends")} style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.text2, marginTop: 10 }} />}
    </FlexWidget>
  );
}
