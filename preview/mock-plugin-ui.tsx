import React, { createContext, useContext } from "react";

type ToastTone = "success" | "error" | "info";

type PluginDataResult<T> = {
  data: T | undefined;
  refresh: () => void;
};

type PreviewDataStore = Map<string, unknown>;

type PreviewContextValue = {
  data: PreviewDataStore;
  actions: string[];
};

const PreviewContext = createContext<PreviewContextValue>({
  data: new Map(),
  actions: [],
});

function makeKey(key: string, args?: unknown) {
  return JSON.stringify([key, args ?? null]);
}

export function PreviewProvider(props: {
  data: Array<[string, unknown]>;
  children: React.ReactNode;
}) {
  return (
    <PreviewContext.Provider
      value={{
        data: new Map(props.data),
        actions: [],
      }}
    >
      {props.children}
    </PreviewContext.Provider>
  );
}

export function usePluginAction(_key: string) {
  return async (payload?: unknown) => {
    const message = typeof window !== "undefined"
      ? `Preview action invoked`
      : "Preview action invoked";
    console.info(message, payload);
    return undefined;
  };
}

export function usePluginToast() {
  return (args: { title: string; body?: string; tone?: ToastTone }) => {
    console.info("Preview toast", args.title, args.tone, args.body);
  };
}

export function usePluginData<T = unknown>(key: string, args?: unknown): PluginDataResult<T> {
  const context = useContext(PreviewContext);
  return {
    data: context.data.get(makeKey(key, args)) as T | undefined,
    refresh: () => undefined,
  };
}

export interface PluginDetailTabProps {
  context: {
    companyId: string;
    projectId?: string;
    entityId: string;
  };
}

export interface PluginProjectSidebarItemProps {
  context: {
    companyId: string;
    entityId: string;
  };
}

export interface PluginSettingsPageProps {
  context: {
    companyId: string;
  };
}

export interface PluginWidgetProps {
  context: {
    companyId?: string;
    projectId?: string;
    entityId?: string;
  };
}
