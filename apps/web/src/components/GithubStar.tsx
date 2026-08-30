import { useEffect, useState } from "react";
import { product } from "@otv/config";

export function GithubStar({ invert = false }: { invert?: boolean }) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${product.githubRepo}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stargazers_count?: number } | null) => {
        if (cancelled || typeof data?.stargazers_count !== "number") return;
        setStars(data.stargazers_count);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      className={invert ? "otv-star otv-star-invert" : "otv-star"}
      href={product.githubUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={stars == null ? "Star OpenTrust Verify on GitHub" : `Star OpenTrust Verify on GitHub, ${stars} stars`}
    >
      <span className="otv-star-face">
        <span className="otv-star-icon" aria-hidden>
          ★
        </span>
        Star
      </span>
      {stars != null && <span className="otv-star-count">{stars}</span>}
    </a>
  );
}
