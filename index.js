import registerRootComponent from "expo/src/launch/registerRootComponent";
import App from "./App";
import { registerWidgets } from "./src/widget";

// Entrada de la app. Además de la app, registra los widgets de Android (solo si el APK los trae).
registerWidgets();
registerRootComponent(App);
