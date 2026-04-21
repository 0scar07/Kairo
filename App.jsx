import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import HomeScreen   from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle:     { backgroundColor: "#0a0e17" },
          headerTintColor: "#c89b3c",
          headerTitleStyle:{ fontWeight: "800", letterSpacing: 1 },
          contentStyle:    { backgroundColor: "#070b12" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "LoLTracker", headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "Perfil del Invocador" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
