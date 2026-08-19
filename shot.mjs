// Captures the marketing hero screenshots from the running app.
import { chromium } from '@playwright/test';

const SHOTS = [
  ['/projects', 'pipeline'],
  ['/dashboard', 'leads'],
  ['/clients', 'clients'],
  ['/invoices', 'payments'],
  ['/automations', 'automations'],
];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:3000/sign-in');
await p.fill('input[type=email]', process.env.SEED_EMAIL ?? 'demo@handled.test');
await p.fill('input[type=password]', process.env.SEED_PASSWORD ?? 'demo123');
await p.click('button[type=submit]');
await p.waitForURL('**/dashboard', { timeout: 60000 });

for (const [route, name] of SHOTS) {
  await p.goto('http://localhost:3000' + route);
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: 'public/marketing/' + name + '.png' });
  console.log('captured', name);
}
await b.close();
