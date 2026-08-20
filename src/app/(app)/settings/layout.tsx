import { SettingsTabs } from './settings-tabs';

/**
 * Two halves that never mix: you, and the business.
 *
 * Which one you are looking at is in the address, so a tab can be linked to,
 * bookmarked, and comes back the same after a reload.
 */
export default function SettingsLayout({ children }: LayoutProps<'/settings'>) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <SettingsTabs />
      <div className="mt-8">{children}</div>
    </>
  );
}
