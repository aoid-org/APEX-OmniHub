import { useEffect } from 'react';

type StructuredDataProps = Readonly<{
  id: string;
  json: string;
}>;

export function StructuredData({ id, json }: StructuredDataProps) {
  useEffect(() => {
    let script = document.querySelector(
      `script[data-schema-id="${id}"]`,
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-schema-id', id);
      document.head.appendChild(script);
    }

    script.text = json;

    return () => {
      script?.remove();
    };
  }, [id, json]);

  return null;
}
