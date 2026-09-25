import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/friends" });
  },
  head: () => ({
    meta: [
      { title: "SplitEase — Split expenses with friends" },
      { name: "description", content: "Track shared expenses, friends and balances in one clean place." },
      { property: "og:title", content: "SplitEase — Split expenses with friends" },
      { property: "og:description", content: "Track shared expenses, friends and balances in one clean place." },
    ],
  }),
});
