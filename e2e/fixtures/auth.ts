import { test as base, request as baseRequest, type Page } from "@playwright/test";

const API = "http://localhost:3001";

function testEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}@e2e.local`;
}

type AuthFixtures = { token: string; userId: number };

export const test = base.extend<AuthFixtures>({
  token: async ({}, use) => {
    const ctx = await baseRequest.newContext();
    const email = testEmail();
    const password = "TestPass123!";
    await ctx.post(`${API}/auth/register`, { data: { email, password } });
    const loginRes = await ctx.post(`${API}/auth/login`, { data: { email, password } });
    const { token } = await loginRes.json();
    await ctx.dispose();
    await use(token);
  },
  userId: async ({ token }, use) => {
    const ctx = await baseRequest.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    const me = await ctx.get(`${API}/me`);
    const user = await me.json();
    await ctx.dispose();
    await use(user.id);
  },
});

export { expect } from "@playwright/test";

export async function setAuthSession(page: Page, token: string) {
  await page.goto("/");
  await page.evaluate((tok: string) => {
    localStorage.setItem("token", tok);
    localStorage.setItem("theme_chosen", "1");
    localStorage.setItem("welcome_npc_done", "1");
    localStorage.setItem("onboarding_dismissed", "1");
  }, token);
  await page.reload();
}
