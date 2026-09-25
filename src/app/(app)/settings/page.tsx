import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { AppearanceSection } from "./appearance-section";
import { readPreferences } from "@/lib/preferences";

export const metadata: Metadata = { title: "Configurações · StudyOS" };

export default async function SettingsPage() {
  const user = await requireUser();
  const prefs = readPreferences(user);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Configurações</h1>

      <div className="stagger space-y-4">
        <AppearanceSection
          themeMode={prefs.themeMode}
          accentColor={prefs.accentColor}
          homePage={prefs.homePage}
          monthlyGoalMinutes={prefs.monthlyGoalMinutes}
          dashboard={prefs.dashboard}
          backgroundStyle={prefs.backgroundStyle}
          backgroundImageId={prefs.backgroundImageId}
        />
      </div>
    </div>
  );
}
