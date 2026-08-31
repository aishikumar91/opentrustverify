import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE_ORIGIN, defaultKeywords, seoForPath } from "@/lib/seo";

function setMeta(attr: "name" | "property", key: string, value: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = seoForPath(pathname);
    const url = `${SITE_ORIGIN}${page.path}`;
    document.title = page.title;
    setMeta("name", "description", page.description);
    setMeta("name", "keywords", defaultKeywords);
    setMeta("name", "robots", "index,follow,max-image-preview:large");
    setMeta("name", "googlebot", "index,follow");
    setMeta("property", "og:title", page.title);
    setMeta("property", "og:description", page.description);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", page.title);
    setMeta("name", "twitter:description", page.description);
    setLink("canonical", url);
  }, [pathname]);

  return null;
}
