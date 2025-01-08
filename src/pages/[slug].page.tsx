import { ParsedUrlQuery } from 'querystring';

import { Box } from '@chakra-ui/react';
import { useContentfulLiveUpdates } from '@contentful/live-preview/react';
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

import { ProductDetails, ProductTileGrid } from '@src/components/features/product';
import { SeoFields } from '@src/components/features/seo';
import { client, previewClient } from '@src/lib/client';
import { getServerSideTranslations } from '@src/pages/utils/get-serverside-translations';

const Page = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation();

  const router = useRouter();
  const product = useContentfulLiveUpdates(props.product);

  if (router.isFallback) {
    return <>Loading...</>;
  }

  return (
    <>
      {product.seoFields && <SeoFields {...product.seoFields} />}
      <ProductDetails {...product} />
      {product.relatedProductsCollection?.items && (
        <Box
          mt={{
            base: 5,
            md: 9,
            lg: 16,
          }}
        >
          <ProductTileGrid
            title={t('product.relatedProducts')}
            products={product.relatedProductsCollection.items}
          />
        </Box>
      )}
    </>
  );
};

export const getStaticPaths = async ({ locales }) => {
  const gqlClient = client;
  const paths: { params: ParsedUrlQuery; locale?: string }[] = [];

  try {
    // multiple locale
    for (const locale of locales) {
      const data = await gqlClient.pageLanding({ locale, preview: false });
      const page = data.pageLandingCollection?.items[0];

      const localePaths = (page?.productsCollection?.items ?? []).map(
        product =>
          ({
            params: {
              slug: product!.slug,
            },
            locale,
          } as { params: ParsedUrlQuery; locale?: string }),
      );

      paths.push(...localePaths);
    }
  } catch (error) {}

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params, locale, preview }) => {
  if (!params?.slug || !locale) {
    return {
      notFound: true,
    };
  }

  const gqlClient = preview ? previewClient : client;

  try {
    const data = await gqlClient.pageProduct({ slug: params.slug.toString(), locale, preview });
    const product = data.pageProductCollection?.items[0];

    if (!product) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        ...(await getServerSideTranslations(locale)),
        product,
      },
    };
  } catch {
    return {
      notFound: true,
    };
  }
};

export default Page;
