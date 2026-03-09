import fs from 'fs';
const filePath = 'apps/omnihub-site/src/pages/Home.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Wait, the error is Unterminated regular expression at `</>`
// Let's check the area
content = content.replace("  );\n}\n      </Layout>\n    </>\n  );\n}", "      </Layout>\n    </>\n  );\n}");

// Let's just fix `HomePage` completely manually.
const match = content.match(/export function HomePage\(\) \{[\s\S]*?\}\n/);
if (match) {
  content = content.replace(match[0], `export function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead {...PAGE_SEO.home} structuredData={homepageStructuredData} />
      <Layout>
        <Hero />
        <HighlightsSection />
        <TriForceSection />
        <OrchestratorSection />
        <FortressSection />
        <ManModeSection />
        <CapabilityShowcase />
        <CTASection />
      </Layout>
    </>
  );
}\n`);
}

fs.writeFileSync(filePath, content);
