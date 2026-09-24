import React from "react";
import EmptyState from "./EmptyState";

// Error a pantalla completa con botón de reintentar
export default function ErrorState({ message, onRetry, retryLabel = "Reintentar" }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Algo salió mal"
      text={message}
      actionLabel={onRetry ? retryLabel : undefined}
      onAction={onRetry}
    />
  );
}
