import React, { useEffect, useState } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { useFonts } from "expo-font";
import HomeScreen      from "./src/screens/HomeScreen";
import ProfileScreen   from "./src/screens/ProfileScreen";
import ValorantScreen  from "./src/screens/ValorantScreen";
import TFTScreen       from "./src/screens/TFTScreen";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import { initDataDragon } from "./src/api/ddragon";
import { migrateLegacyStorage } from "./src/utils/storage";
import {
  colors, fontAssets, fonts, fontSizes, sizes, spacing, tracking, GameProvider, useAccent,
} from "./src/theme";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, border: colors.border, text: colors.text },
};

function SearchStack() {
  const accent = useAccent();
  const stackOptions = {
    headerStyle:      { backgroundColor: colors.surface },
    headerTintColor:  accent,
    headerTitleStyle: { fontFamily: fonts.display, letterSpacing: tracking.wide },
    contentStyle:     { backgroundColor: colors.bg },
  };
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Home"     component={HomeScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Profile"  component={ProfileScreen}  options={{ title: "League of Legends" }} />
      <Stack.Screen name="Valorant" component={ValorantScreen} options={{ title: "Valorant" }} />
      <Stack.Screen name="TFT"      component={TFTScreen}      options={{ title: "TFT" }} />
    </Stack.Navigator>
  );
}

function MyProfileStack() {
  const accent = useAccent("lol"); // Mi Perfil es siempre de LoL
  return (
    <Stack.Navigator screenOptions={{
      headerStyle:      { backgroundColor: colors.surface },
      headerTintColor:  accent,
      headerTitleStyle: { fontFamily: fonts.display, letterSpacing: tracking.wide },
      contentStyle:     { backgroundColor: colors.bg },
    }}>
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: "Mi Perfil" }} />
    </Stack.Navigator>
  );
}

function Tabs() {
  const accent = useAccent();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: sizes.hairline,
          height: sizes.button + spacing.md,
          paddingBottom: spacing.sm,
        },
        tabBarActiveTintColor:   accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: fonts.displaySemi, fontSize: fontSizes.xs, letterSpacing: tracking.wide },
      }}
    >
      <Tab.Screen
        name="Buscar"
        component={SearchStack}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: fontSizes.xl, color }}>🔍</Text> }}
      />
      <Tab.Screen
        name="Yo"
        component={MyProfileStack}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: fontSizes.xl, color }}>⚔️</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [ready, setReady] = useState(false);

  // Lee la versión vigente de Data Dragon y migra claves antiguas antes de mostrar la interfaz
  useEffect(() => {
    Promise.all([migrateLegacyStorage(), initDataDragon()]).finally(() => setReady(true));
  }, []);

  if (!(fontsLoaded || fontError) || !ready) return null;

  return (
    <GameProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Tabs />
      </NavigationContainer>
    </GameProvider>
  );
}
