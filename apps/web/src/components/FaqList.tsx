import { useEffect } from "react";

export type FaqItem = { q: string; a: string };

export function FaqList({ items }: { items: readonly FaqItem[] }) {
  useEffect(() => {
    const previous = document.head.querySelector('script[data-otv-faq="1"]');
    previous?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.otvFaq = "1";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [items]);

  return (
    <div className="otv-faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p className="otv-faq-a">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
