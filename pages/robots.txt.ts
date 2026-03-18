import type { GetServerSideProps } from 'next';
import { AI_CRAWLER_AGENTS, buildAbsoluteUrl, resolveSiteOrigin } from '@/lib/seo';

const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const origin = resolveSiteOrigin(req.headers.host, req.headers['x-forwarded-proto'] as string | undefined);
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    ...AI_CRAWLER_AGENTS.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${buildAbsoluteUrl(origin, '/sitemap.xml')}`,
    `LLM-Content: ${buildAbsoluteUrl(origin, '/llms.txt')}`,
  ];

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(lines.join('\n'));
  res.end();

  return {
    props: {},
  };
};

export { getServerSideProps };

export default function RobotsTxt() {
  return null;
}
