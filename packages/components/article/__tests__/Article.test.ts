// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { ArticleBuilder } from "../Article";

/** The API envelope shape the builder accepts: records under `data`. */
const data = {
  data: [
    { slug: "article-1", title: "Article 1", thumbnail: "img1.png", date: "2026-11-11", body: "Hello world" },
    { slug: "article-2", title: "Article 2", thumbnail: "img2.png", date: "2026-11-12", body: "Second article" },
  ],
};

describe("ArticleBuilder views and navigation contract (P7)", () => {
  it("renders views without direct history manipulation", () => {
    const pushSpy = vi.spyOn(history, "pushState");
    const navigateSpy = vi.fn();

    const builder = new ArticleBuilder({
      views: [
        { view: "controls" },
        { view: "list", display: "card" },
        { view: "aside", count: 2 },
      ],
      navigate: navigateSpy,
    });

    const root = builder.create(data);
    expect(root).toBeTruthy();
    expect(root.querySelector('[data-view="list"]')).not.toBeNull();

    // Click on article card
    const card = root.querySelector('[data-article-id="article-1"]') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();

    // Verify detail view activated
    expect(root.querySelector("article.detail")).not.toBeNull();
    // Verify history was NOT called directly by the component
    expect(pushSpy).not.toHaveBeenCalled();
    // Verify intent expressed through navigate callback
    expect(navigateSpy).toHaveBeenCalledWith("article-1");

    // Click on back button
    const backBtn = root.querySelector("button.back") as HTMLElement;
    expect(backBtn).not.toBeNull();
    backBtn.click();

    // Verify list view restored
    expect(root.querySelector('[data-view="list"]')).not.toBeNull();
    expect(pushSpy).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith("");

    pushSpy.mockRestore();
  });

  it("opens the record named by config on first paint, without announcing a navigation", () => {
    const navigateSpy = vi.fn();
    const builder = new ArticleBuilder({
      initialSlug: "article-2",
      initialView: "detail",
      navigate: navigateSpy,
    });

    const root = builder.create(data);

    const detail = root.querySelector("article.detail");
    expect(detail).not.toBeNull();
    expect(detail!.textContent).toContain("Article 2");
    // The host already rendered this URL; navigating again would loop back into it.
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("falls back to the list when the deep-linked slug is not in the payload", () => {
    const builder = new ArticleBuilder({ initialSlug: "missing", initialView: "detail" });

    const root = builder.create(data);

    expect(root.querySelector('[data-view="list"]')).not.toBeNull();
    expect(root.querySelector("article.detail")).toBeNull();
  });

  it("does not render a view the config leaves out", () => {
    const builder = new ArticleBuilder({ views: [{ view: "list" }] });

    const root = builder.create(data);

    expect(root.querySelector('[data-view="list"]')).not.toBeNull();
    expect(root.querySelector('[data-view="controls"]')).toBeNull();
  });
});

