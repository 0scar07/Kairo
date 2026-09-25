import React, { useState } from "react";
import { Platform, View } from "react-native";
import * as Linking from "expo-linking";
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
import LiveGameScreen  from "./src/games/lol/LiveGameScreen";
import SearchResultsScreen from "./src/screens/SearchResultsScreen";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import FloatingTabBar from "./src/components/FloatingTabBar";
import { getGame } from "./src/games";
import { useBoot } from "./src/boot/useBoot";
import { BootProvider } from "./src/boot/BootContext";
import { I18nProvider, useT } from "./src/i18n/I18nProvider";
import { NotificationsProvider } from "./src/notifications/NotificationsProvider";
import PermissionSheet from "./src/notifications/PermissionSheet";
import BannerHost from "./src/notifications/BannerHost";
import { navigationRef, flushNavigationQueue } from "./src/navigation/ref";
import { colors, fonts, tracking, GameProvider, useAccent } from "./src/theme";

// El splash nativo se queda visible hasta que la pantalla de carga animada esté montada
SplashScreen.preventAutoHideAsync().catch(e => console.warn("No se pudo retener el splash nativo:", e.message));

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// Enlaces profundos (kairo://live/la1/<puuid>): abren la partida en vivo. En la web la URL ya es la del navegador.
const linking = Platform.OS === "web" ? undefined : {
  prefixes: [Linking.createURL("/"), "kairo://"],
  config: { screens: { LiveGame: "live/:region/:puuid", Tabs: { screens: { Inicio: "", Favoritos: "favoritos", Ajustes: "ajustes" } } } },
};

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
  const t = useT();
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
        options={({ route }) => ({ title: getGame(route.params.gameId)?.name ?? t("screens.profile") })}
      />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: t("screens.myProfile") }} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={({ route }) => ({ title: getGame(route.params.gameId)?.name ?? t("screens.results") })} />
      <Stack.Screen name="LiveGame" component={LiveGameScreen} options={{ title: t("screens.live") }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { progress, fontsReady, result, finished } = useBoot();
  const [loaderGone, setLoaderGone] = useState(false);

  return (
    <SafeAreaProvider>
      <I18nProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />

        {/* La app se monta al llegar a 100 %, justo cuando la pantalla de carga empieza su fade-out */}
        {finished && result && (
          <BootProvider boot={result}>
            <GameProvider initialGame={result.prefs.activeGame}>
              <NotificationsProvider>
                <NavigationContainer ref={navigationRef} onReady={flushNavigationQueue} linking={linking} theme={navTheme}>
                  <RootStack />
                </NavigationContainer>
                <PermissionSheet />
                <BannerHost />
              </NotificationsProvider>
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
      </I18nProvider>
    </SafeAreaProvider>
  );
}
