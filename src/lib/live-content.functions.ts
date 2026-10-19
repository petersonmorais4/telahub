import { createServerFn } from "@tanstack/react-start";
import { liveContentInput, loadLiveContent } from "./live-content-source";

export type { LiveContent, WeatherContent, MarketContent } from "./live-content-source";

export const getLiveContent = createServerFn({ method: "GET" })
  .inputValidator((input) => liveContentInput.parse(input))
  .handler(({ data }) => loadLiveContent(data));
