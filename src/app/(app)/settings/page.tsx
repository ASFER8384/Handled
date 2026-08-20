import { redirect } from 'next/navigation';

/** Settings is always one of its tabs; the bare address picks the first. */
export default function SettingsIndex() {
  redirect('/settings/account');
}
