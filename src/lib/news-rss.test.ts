import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseG1Rss } from "./live-content-source";

const xml = `<rss><channel>
<item><title>Manchete &amp; teste</title><atom:subtitle>Resumo curto</atom:subtitle>
<description><![CDATA[ <img src="https://img.g1/x.png" /> ]]></description>
<pubDate>Wed, 28 Oct 2026 20:00:00 -0000</pubDate></item>
<item><title><![CDATA[Segunda]]></title></item>
</channel></rss>`;

describe("parseG1Rss", () => {
  test("extracts headline, summary and image", () => {
    const items = parseG1Rss(xml);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.title, "Manchete & teste");
    assert.equal(items[0]?.summary, "Resumo curto");
    assert.equal(items[0]?.image, "https://img.g1/x.png");
    assert.equal(items[1]?.title, "Segunda");
  });
});
