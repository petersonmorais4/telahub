import { describe, expect, it } from "vitest";
import { parseG1Rss } from "./live-content-source";

const xml = `<rss><channel>
<item><title>Manchete &amp; teste</title><atom:subtitle>Resumo curto</atom:subtitle>
<description><![CDATA[ <img src="https://img.g1/x.png" /> ]]></description>
<pubDate>Wed, 28 Oct 2026 20:00:00 -0000</pubDate></item>
<item><title><![CDATA[Segunda]]></title></item>
</channel></rss>`;

describe("parseG1Rss", () => {
  it("extracts headline, summary and image", () => {
    const items = parseG1Rss(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: "Manchete & teste", summary: "Resumo curto", image: "https://img.g1/x.png" });
    expect(items[1]?.title).toBe("Segunda");
  });
});
