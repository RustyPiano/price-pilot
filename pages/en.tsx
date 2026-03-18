import type { GetStaticProps } from 'next';
import { HomePage } from '@/pages/index';
import type { Locale } from '@/types';

export const getStaticProps: GetStaticProps<{ initialLocale: Locale }> = async () => ({
  props: {
    initialLocale: 'en',
  },
});

export default HomePage;
