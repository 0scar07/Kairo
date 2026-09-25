import { createNavigationContainerRef } from "@react-navigation/native";

// Referencia global a la navegación: permite abrir pantallas desde fuera de un componente (al tocar una notificación).
// Si la app todavía está arrancando, el destino queda en cola y se abre cuando el contenedor está listo.
export const navigationRef = createNavigationContainerRef();

const queue = [];

export function navigateWhenReady(name, params) {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
  else queue.push([name, params]);
}

export function flushNavigationQueue() {
  while (queue.length) {
    const [name, params] = queue.shift();
    navigationRef.navigate(name, params);
  }
}
