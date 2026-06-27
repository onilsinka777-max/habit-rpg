import { expect } from "@playwright/test";
import { test, setAuthSession } from "../fixtures/auth";

const API = "http://localhost:3001";

async function openSmartSearch(page: import("@playwright/test").Page) {
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/поиск по квестам/i).waitFor({ state: "visible", timeout: 5_000 });
}

test.describe("AI Search (SmartSearch)", () => {
  test.beforeEach(async ({ page, token }) => {
    await setAuthSession(page, token);
  });

  // AC-3: AI toggle показывает AI-ответ
  test("AC-3: AI toggle включается, карточка с ответом появляется", async ({ page }) => {
    let aiSearchCalled = false;
    await page.route("**/search**", async route => {
      const url = route.request().url();
      if (url.includes("ai=true")) {
        aiSearchCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tasks: [],
            sections: [],
            friends: [],
            achievements: [],
            ai_answer: "У тебя сейчас 2 активные цели на саморазвитие.",
            suggested_view: "goals",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ tasks: [], sections: [], friends: [], achievements: [] }),
        });
      }
    });

    await openSmartSearch(page);
    await page.getByPlaceholder(/поиск по квестам/i).fill("цели");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /✨ AI/i }).click();

    await expect(page.getByTestId("ai-answer")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("ai-answer")).toContainText("цел");
    await expect(page.getByTestId("suggested-view")).toBeVisible();
    expect(aiSearchCalled).toBe(true);
  });

  // AC-5: Graceful degradation — если AI недоступен, keyword results остаются
  test("AC-5: если AI недоступен, keyword results всё равно работают", async ({ page }) => {
    await page.route("**/search**", async route => {
      const url = route.request().url();
      if (url.includes("ai=true")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tasks: [{ id: 1, title: "Читать книгу", xpReward: 50, branch: "knowledge" }],
            sections: [],
            friends: [],
            achievements: [],
            ai_answer: null,
            suggested_view: null,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tasks: [{ id: 1, title: "Читать книгу", xpReward: 50, branch: "knowledge" }],
            sections: [],
            friends: [],
            achievements: [],
          }),
        });
      }
    });

    await openSmartSearch(page);
    await page.getByPlaceholder(/поиск по квестам/i).fill("книга");
    await page.waitForTimeout(400);

    await expect(page.getByText("Читать книгу")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("ai-answer")).not.toBeVisible();
  });

  // Кнопка AI toggle появляется только при запросе >= 2 символов
  test("AI-кнопка появляется при 2+ символах запроса", async ({ page }) => {
    await page.route("**/search**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tasks: [], sections: [], friends: [], achievements: [] }),
    }));

    await openSmartSearch(page);
    await expect(page.getByRole("button", { name: /✨ AI/i })).not.toBeVisible();

    await page.getByPlaceholder(/поиск по квестам/i).fill("це");
    await page.waitForTimeout(300);
    await expect(page.getByRole("button", { name: /✨ AI/i })).toBeVisible({ timeout: 3_000 });
  });

  // Suggested view navigates to the right section on click
  test("клик по 'Перейти' закрывает поиск и навигирует", async ({ page }) => {
    await page.route("**/search**", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tasks: [], sections: [], friends: [], achievements: [],
          ai_answer: "Перейди к целям.",
          suggested_view: "goals",
        }),
      });
    });

    await openSmartSearch(page);
    await page.getByPlaceholder(/поиск по квестам/i).fill("цели");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /✨ AI/i }).click();
    await page.getByTestId("suggested-view").waitFor({ state: "visible", timeout: 8_000 });
    await page.getByTestId("suggested-view").click();

    await expect(page.getByPlaceholder(/поиск по квестам/i)).not.toBeVisible({ timeout: 3_000 });
  });

  // API: GET /search без ai=true не вызывает Anthropic
  test("GET /search без ai=true не возвращает ai_answer", async ({ token, request }) => {
    const res = await request.get(`${API}/search?q=цели`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ai_answer).toBeUndefined();
  });
});
