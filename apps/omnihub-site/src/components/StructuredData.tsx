import { useEffect } from 'react';
import { Head } from 'vite-react-ssg';

type StructuredDataProps = Readonly<{
  id: string;
  json: string;
}>;

export function StructuredData({ id, json }: StructuredDataProps) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let script = document.querySelector(
      `script[data-schema-id="${id}"]`,
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.schemaId = id;
      document.head.appendChild(script);
    }

    script.text = json;

    return () => {
      script?.remove();
    };
  }, [id, json]);

  if (typeof window !== 'undefined') {
    return null;
  }

  return (
    <Head>
      <script
        type="application/ld+json"
        data-schema-id={id}
        dangerouslySetInnerHTML={{ __html: json }}
      />
    </Head>
  );
}
