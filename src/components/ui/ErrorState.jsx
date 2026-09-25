import React from "react";
import { useT } from "../../i18n/I18nProvider";
import EmptyState from "./EmptyState";

// Error a pantalla completa con botón de reintentar
export default function ErrorState({ message, onRetry, retryLabel }) {
  const t = useT();
  return (
    <EmptyState
      icon="alert"
      title={t("common.wentWrong")}
      text={message}
      actionLabel={onRetry ? retryLabel || t("common.retry") : undefined}
      onAction={onRetry}
    />
  );
}
