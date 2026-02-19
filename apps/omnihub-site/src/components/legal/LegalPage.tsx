import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Section } from '@/components/Section';

type LegalPageProps = {
  title: string;
  documentPath: string;
  markdownLoader: () => Promise<{ default: string }>;
};

function renderMarkdown(markdown: string): JSX.Element[] {
  const lines = markdown.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) {
      return;
    }

    elements.push(
      <ul key={key}>
        {listItems.map((item) => (
          <li key={`${key}-${item}`}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`list-${index}`);
      return;
    }

    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }

    flushList(`list-${index}`);

    if (line.startsWith('# ')) {
      elements.push(
        <h1 className="heading-1" key={`h1-${index}`}>
          {line.slice(2)}
        </h1>,
      );
      return;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 className="heading-3" key={`h2-${index}`}>
          {line.slice(3)}
        </h2>,
      );
      return;
    }

    elements.push(<p key={`p-${index}`}>{line.replaceAll('**', '')}</p>);
  });

  flushList('list-final');

  return elements;
}

export function LegalPage({ title, documentPath, markdownLoader }: LegalPageProps) {
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    markdownLoader()
      .then((module) => setMarkdown(module.default))
      .catch(() => setError(`Unable to load canonical legal doc from ${documentPath}.`));
  }, [documentPath, markdownLoader]);

  return (
    <Layout title={title}>
      <Section variant="default">
        <div className="legal-content" data-canonical-doc={documentPath}>
          {error ? <p>{error}</p> : renderMarkdown(markdown)}
        </div>
      </Section>
    </Layout>
  );
}
