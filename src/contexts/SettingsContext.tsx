import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi, type SettingsGrouped } from "@/lib/api";

interface SettingsContextType {
  settings: SettingsGrouped | undefined;
  isLoading: boolean;
  getSetting: (key: string, defaultValue?: any) => any;
  getCompanyName: () => string;
  getCurrency: () => { code: string; symbol: string; position: string; decimals: number };
  getTheme: () => string;
  getDateFormat: () => string;
  getTimezone: () => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useQuery<SettingsGrouped>({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getAll(),
    staleTime: 60000, // Cache for 1 minute
  });

  const getSetting = (key: string, defaultValue: any = ""): any => {
    if (!settings) return defaultValue;
    
    // Find setting across all categories
    for (const category of Object.values(settings)) {
      const setting = category.find((s) => s.key === key);
      if (setting) {
        // Convert based on type
        if (setting.type === "boolean") {
          return setting.value === true || setting.value === "true";
        }
        if (setting.type === "number") {
          return Number(setting.value);
        }
        return setting.value;
      }
    }
    return defaultValue;
  };

  const getCompanyName = (): string => {
    return getSetting("company.name", "Meilleur Insights") ||
           getSetting("reports.companyName", "Meilleur Insights") ||
           getSetting("app.name", "Meilleur Insights") ||
           "Meilleur Insights";
  };

  const getCurrency = () => {
    return {
      code: getSetting("currency.code", "TSH"),
      symbol: getSetting("currency.symbol", "TSh"),
      position: getSetting("currency.position", "before"),
      decimals: getSetting("currency.decimalPlaces", 0),
    };
  };

  const getTheme = (): string => {
    return getSetting("appearance.theme", "system");
  };

  const getDateFormat = (): string => {
    return getSetting("app.dateFormat", "DD/MM/YYYY");
  };

  const getTimezone = (): string => {
    return getSetting("app.timezone", "Africa/Dar_es_Salaam");
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        getSetting,
        getCompanyName,
        getCurrency,
        getTheme,
        getDateFormat,
        getTimezone,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
