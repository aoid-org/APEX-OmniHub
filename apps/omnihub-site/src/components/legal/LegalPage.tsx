import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Section } from '@/components/Section';

type LegalPageProps = Readonly<{
  title: string;
  documentPath: string;
  markdownLoader: () => Promise<{ default: string }>;
}>;

function createKeyFactory(): (prefix: string, value: string) => string {
  const seen = new Map<string, number>();

  return (prefix: string, value: string) => {
    const base = `${prefix}-${value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

function renderMarkdown(markdown: string): JSX.Element[] {
  const lines = markdown.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  const getKey = createKeyFactory();

  const flushList = (keySeed: string) => {
    if (listItems.length === 0) {
      return;
    }

    const listKey = getKey('list', keySeed);
    elements.push(
      <ul key={listKey}>
        {listItems.map((item) => (
          <li key={getKey('item', `${listKey}-${item}`)}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`line-${line}`);
      return;
    }

    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }

    flushList(`line-${line}`);

    if (line.startsWith('# ')) {
      elements.push(
        <h1 className="heading-1" key={getKey('h1', line)}>
          {line.slice(2)}
        </h1>,
      );
      return;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 className="heading-3" key={getKey('h2', line)}>
          {line.slice(3)}
        </h2>,
      );
      return;
    }

    elements.push(<p key={getKey('p', line)}>{line.replaceAll('**', '')}</p>);
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
