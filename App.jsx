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
import CompareScreen   from "./src/games/lol/CompareScreen";
import SearchResultsScreen from "./src/screens/SearchResultsScreen";
import SearchScreen from "./src/screens/SearchScreen";
import LeaderboardScreen from "./src/games/lol/LeaderboardScreen";
import ProTeamScreen from "./src/games/lol/ProTeamScreen";
import ProPlayerScreen from "./src/games/lol/ProPlayerScreen";
import RankHistoryScreen from "./src/games/lol/RankHistoryScreen";
import MatchupScreen from "./src/games/lol/MatchupScreen";
import WRTierListScreen from "./src/games/wildrift/TierListScreen";
import WRChampionScreen from "./src/games/wildrift/ChampionScreen";
import WREsportsScreen from "./src/games/wildrift/EsportsScreen";
import WRChampionsScreen from "./src/games/wildrift/ChampionsScreen";
import WRCompareScreen from "./src/games/wildrift/CompareScreen";
import VALEsportsScreen from "./src/games/valorant/EsportsScreen";
import VALMatchScreen from "./src/games/valorant/MatchScreen";
import WeekRecapScreen from "./src/games/lol/WeekRecapScreen";
import NewsArticleScreen from "./src/news/ArticleScreen";
import ClipsScreen from "./src/clips/ClipsScreen";
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
import { HudHost } from "./src/components/ui";
import WhatsNew from "./src/components/WhatsNew";
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
      headerTitleStyle: { fontFamily: fonts.display, letterSpacing: tracking.tight },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
      contentStyle:     { backgroundColor: colors.bg },
      // Volver deslizando desde cualquier punto (iOS) y la misma transición lateral en Android
      fullScreenGestureEnabled: true,
      animation: Platform.OS === "android" ? "slide_from_right" : "default",
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
      <Stack.Screen name="Compare" component={CompareScreen} options={{ title: t("screens.compare") }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: t("explore.tabRanking") }} />
      <Stack.Screen name="ProTeam" component={ProTeamScreen} options={{ title: t("explore.tabPros") }} />
      <Stack.Screen name="ProPlayer" component={ProPlayerScreen} options={{ title: t("explore.tabPros") }} />
      <Stack.Screen name="RankHistory" component={RankHistoryScreen} options={{ title: t("lpHistory.title") }} />
      <Stack.Screen name="Matchup" component={MatchupScreen} options={{ title: t("matchup.title") }} />
      <Stack.Screen name="WRTierList" component={WRTierListScreen} options={{ title: t("wr.tierList") }} />
      <Stack.Screen name="WRChampion" component={WRChampionScreen} options={{ title: "Wild Rift" }} />
      <Stack.Screen name="WREsports" component={WREsportsScreen} options={{ title: t("wr.esports") }} />
      <Stack.Screen name="WRChampions" component={WRChampionsScreen} options={{ title: t("wr.champions") }} />
      <Stack.Screen name="WRCompare" component={WRCompareScreen} options={{ title: t("wr.compare") }} />
      <Stack.Screen name="VALEsports" component={VALEsportsScreen} options={{ title: t("wr.esports") }} />
      <Stack.Screen name="VALMatch" component={VALMatchScreen} options={{ title: "Valorant" }} />
      <Stack.Screen name="WeekRecap" component={WeekRecapScreen} options={{ headerShown: false, animation: "fade_from_bottom", title: t("recap.kicker") }} />
      <Stack.Screen name="NewsArticle" component={NewsArticleScreen} options={{ headerShown: false, title: t("explore.tabNews") }} />
      <Stack.Screen name="Clips" component={ClipsScreen} options={{ headerShown: false, title: t("explore.tabClips"), animation: "fade_from_bottom" }} />
      {/* Buscar desde cualquier pestaña: hoja en iOS (se cierra deslizando), pantalla que sube en Android */}
      <Stack.Screen name="Search" component={SearchScreen} options={{ presentation: "modal", headerShown: false, title: t("tabs.search") }} />
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
                <HudHost />
                <WhatsNew />
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
