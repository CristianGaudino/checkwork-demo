import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ErrorScreen } from "./ErrorScreen";

describe("ErrorScreen", () => {
  it("shows the default title and button, and the line about the connection", () => {
    const html = renderToStaticMarkup(createElement(ErrorScreen, { retry: () => {} }));
    expect(html).toContain("Something went wrong");
    expect(html).toContain("Try again");
    expect(html).toContain("Check your connection and try again.");
  });

  it("takes its own title and button, in one h1", () => {
    const html = renderToStaticMarkup(createElement(ErrorScreen, { title: "We couldn't load this car", button: "Try again", retry: () => {} }));
    expect(html).toContain("We couldn&#x27;t load this car");
    expect(html).toContain("Try again");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it("the button calls retry", () => {
    const retry = vi.fn();
    const main = ErrorScreen({ retry }) as { props: { children: { type: string; props: { onClick(): void } }[] } };
    const button = main.props.children.find((c) => c.type === "button")!;
    button.props.onClick();
    expect(retry).toHaveBeenCalledOnce();
  });
});
