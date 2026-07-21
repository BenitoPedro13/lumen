import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_LOG_SHORTCUT_URL: process.env.NEXT_PUBLIC_LOG_SHORTCUT_URL || "",
    NEXT_PUBLIC_ASK_SHORTCUT_URL: process.env.NEXT_PUBLIC_ASK_SHORTCUT_URL || "",
  },
};

export default config;
