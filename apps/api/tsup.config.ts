import { defineConfig } from "tsup";

export default defineConfig({
  noExternal: ["@nfc/contracts"],
});
