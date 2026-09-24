import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { profileIconUrl } from "../api/ddragon";

export default function ProfileIcon({ iconId, level, size = 72 }) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={{ uri: profileIconUrl(iconId) }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>{level}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    borderWidth: 3,
    borderColor: "#c89b3c",
  },
  levelBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    backgroundColor: "#c89b3c",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelText: {
    color: "#0a0e17",
    fontSize: 10,
    fontWeight: "800",
  },
});
