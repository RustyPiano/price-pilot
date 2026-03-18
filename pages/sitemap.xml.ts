import type { GetServerSideProps } from 'next';
import { buildAbsoluteUrl, escapeXml, resolveSiteOrigin } from '@/lib/seo';

const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const origin = resolveSiteOrigin(req.headers.host, req.headers['x-forwarded-proto'] as string | undefined);
  const urls = ['/', '/en'];
  const lastModified = new Date().toISOString();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((path) => {
      const loc = escapeXml(buildAbsoluteUrl(origin, path));
      return [
        '<url>',
        `<loc>${loc}</loc>`,
        `<lastmod>${lastModified}</lastmod>`,
        '</url>',
      ].join('');
    }),
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.write(xml);
  res.end();

  return {
    props: {},
  };
};

export { getServerSideProps };

export default function SitemapXml() {
  return null;
}
