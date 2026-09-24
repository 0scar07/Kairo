import React, { useState } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import HomeScreen      from "./src/screens/HomeScreen";
import FavoritesScreen from "./src/screens/FavoritesScreen";
import SettingsScreen  from "./src/screens/SettingsScreen";
import ProfileScreen   from "./src/screens/ProfileScreen";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import FloatingTabBar from "./src/components/FloatingTabBar";
import { getGame } from "./src/games";
import { useBoot } from "./src/boot/useBoot";
import { BootProvider } from "./src/boot/BootContext";
import { colors, fonts, tracking, GameProvider, useAccent } from "./src/theme";

// El splash nativo se queda visible hasta que la pantalla de carga animada esté montada
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, border: colors.border, text: colors.text },
};

// Tres pestañas con barra flotante; el perfil de un jugador se abre encima (a pantalla completa)
function Tabs() {
  return (
    <Tab.Navigator
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tab.Screen name="Inicio"    component={HomeScreen} />
      <Tab.Screen name="Favoritos" component={FavoritesScreen} />
      <Tab.Screen name="Ajustes"   component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  const accent = useAccent();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle:      { backgroundColor: colors.surface },
      headerTintColor:  accent,
      headerTitleStyle: { fontFamily: fonts.display, letterSpacing: tracking.wide },
      contentStyle:     { backgroundColor: colors.bg },
    }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ route }) => ({ title: getGame(route.params.gameId)?.name ?? "Perfil" })}
      />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: "Mi perfil" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { progress, fontsReady, result, finished } = useBoot();
  const [loaderGone, setLoaderGone] = useState(false);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />

        {/* La app se monta al llegar a 100 %, justo cuando la pantalla de carga empieza su fade-out */}
        {finished && result && (
          <BootProvider boot={result}>
            <GameProvider initialGame={result.prefs.activeGame}>
              <NavigationContainer theme={navTheme}>
                <RootStack />
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
    </SafeAreaProvider>
  );
}
