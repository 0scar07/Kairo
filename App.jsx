import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import HomeScreen      from "./src/screens/HomeScreen";
import ProfileScreen   from "./src/screens/ProfileScreen";
import ValorantScreen  from "./src/screens/ValorantScreen";
import TFTScreen       from "./src/screens/TFTScreen";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import { initDataDragon } from "./src/api/ddragon";
import { migrateLegacyStorage } from "./src/utils/storage";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const stackOptions = {
  headerStyle:      { backgroundColor: "#0a0e17" },
  headerTintColor:  "#c89b3c",
  headerTitleStyle: { fontWeight: "800", letterSpacing: 1 },
  contentStyle:     { backgroundColor: "#070b12" },
};

function SearchStack() {
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
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="MyProfile"
        component={MyProfileScreen}
        options={{ title: "Mi Perfil" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  // Lee la versión vigente de Data Dragon antes de mostrar imágenes
  useEffect(() => {
    Promise.all([migrateLegacyStorage(), initDataDragon()]).finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0a0e17",
            borderTopColor: "#1e2a3a",
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor:   "#c89b3c",
          tabBarInactiveTintColor: "#334455",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
        }}
      >
        <Tab.Screen
          name="Buscar"
          component={SearchStack}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text>,
          }}
        />
        <Tab.Screen
          name="Yo"
          component={MyProfileStack}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚔️</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}