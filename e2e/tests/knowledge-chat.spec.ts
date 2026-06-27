import { expect } from "@playwright/test";
import { test, setAuthSession } from "../fixtures/auth";

const API = "http://localhost:3001";

test.describe("Knowledge Chat", () => {
  test.beforeEach(async ({ page, token }) => {
    await setAuthSession(page, token);
  });

  // AC-1: Claude получает реальные данные пользователя
  test("AC-1: ответ приходит и messagesLeft уменьшается", async ({ page, token }) => {
    await page.request.post(`${API}/goals`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Читать 20 книг в год", description: "Цель на 2026" },
    });

    await page.getByRole("button", { name: /создатель/i }).click();
    await page.getByRole("button", { name: /база знаний/i }).click();

    const before = await page.getByText(/\/10 сообщений/).textContent();

    const responsePromise = page.waitForResponse(
      r => r.url().includes("/knowledge/chat") && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.getByPlaceholder(/спроси о своих целях/i).fill("какие у меня активные цели?");
    await page.getByPlaceholder(/спроси о своих целях/i).press("Enter");

    const response = await responsePromise;
    const body = await response.json();
    expect(body.reply).toBeTruthy();
    expect(body.reply.length).toBeGreaterThan(10);
    expect(typeof body.messagesLeft).toBe("number");

    await page.locator("[data-role='assistant']").last().waitFor({ state: "visible", timeout: 10_000 });

    const after = await page.getByText(/\/10 сообщений/).textContent();
    expect(after).not.toBe(before);
  });

  // AC-2: Daily limit
  test("AC-2: при лимите кнопка задизаблена", async ({ page }) => {
    await page.route("**/knowledge/chat", async route => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ message: "Лимит на сегодня: 10 сообщений. Приходи завтра.", messagesLeft: 0 }),
      });
    });

    await page.getByRole("button", { name: /создатель/i }).click();
    await page.getByRole("button", { name: /база знаний/i }).click();

    await page.getByPlaceholder(/спроси о своих целях/i).fill("тест лимита");
    await page.getByPlaceholder(/спроси о своих целях/i).press("Enter");

    await expect(page.getByText(/лимит/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/спроси о своих целях/i)).toBeDisabled({ timeout: 3_000 });
  });

  // Пустое сообщение не отправляется
  test("пустое сообщение не вызывает API-запрос", async ({ page }) => {
    let called = false;
    await page.route("**/knowledge/chat", () => { called = true; });

    await page.getByRole("button", { name: /создатель/i }).click();
    await page.getByRole("button", { name: /база знаний/i }).click();

    await page.getByPlaceholder(/спроси о своих целях/i).fill("   ");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    expect(called).toBe(false);
  });

  // API: сообщение > 500 символов → 400
  test("сообщение длиннее 500 символов отклоняется с 400", async ({ token, request }) => {
    const res = await request.post(`${API}/knowledge/chat`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: "а".repeat(501), history: [] },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/длинн/i);
  });
});
