import React, { useState } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import HomeScreen      from "./src/screens/HomeScreen";
import ProfileScreen   from "./src/screens/ProfileScreen";
import ValorantScreen  from "./src/screens/ValorantScreen";
import TFTScreen       from "./src/screens/TFTScreen";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import { useBoot } from "./src/boot/useBoot";
import { BootProvider } from "./src/boot/BootContext";
import {
  colors, fonts, fontSizes, sizes, spacing, tracking, GameProvider, useAccent,
} from "./src/theme";

// El splash nativo se queda visible hasta que la pantalla de carga animada esté montada
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const { progress, fontsReady, result, finished } = useBoot();
  const [loaderGone, setLoaderGone] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />

      {/* La app se monta al llegar a 100 %, justo cuando la pantalla de carga empieza su fade-out */}
      {finished && result && (
        <BootProvider boot={result}>
          <GameProvider initialGame={result.activeGame}>
            <NavigationContainer theme={navTheme}>
              <Tabs />
            </NavigationContainer>
          </GameProvider>
        </BootProvider>
      )}

      {!loaderGone && (
        <LoadingScreen
          progress={progress}
          textsReady={fontsReady}
          finished={finished}
          onHidden={() => setLoaderGone(true)}
        />
      )}
    </View>
  );
}
