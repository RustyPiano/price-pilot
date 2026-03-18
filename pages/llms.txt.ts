import type { GetServerSideProps } from 'next';
import { buildLlmsText, resolveSiteOrigin } from '@/lib/seo';

const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const origin = resolveSiteOrigin(req.headers.host, req.headers['x-forwarded-proto'] as string | undefined);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(buildLlmsText(origin));
  res.end();

  return {
    props: {},
  };
};

export { getServerSideProps };

export default function LlmsTxt() {
  return null;
}
