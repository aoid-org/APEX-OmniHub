import { Head } from 'vite-react-ssg';

type StructuredDataProps = Readonly<{
  id: string;
  json: string;
}>;

export function StructuredData({ id, json }: StructuredDataProps) {
  return (
    <Head>
      <script type="application/ld+json" data-schema-id={id}>
        {json}
      </script>
    </Head>
  );
}
