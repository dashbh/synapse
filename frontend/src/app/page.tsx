import { redirect } from 'next/navigation';
import { appRegistry } from '@/platform/registry/AppRegistry';

export default function Home() {
  const firstApp = appRegistry[0];
  if (firstApp) {
    redirect(firstApp.route);
  }
  return null;
}
