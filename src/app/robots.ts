import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/sites/"],
      disallow: [
        "/omnisite",
        "/platform",
        "/api/",
        "/dashboard",
        "/my-family",
        "/team/",
      ],
    },
  };
}
