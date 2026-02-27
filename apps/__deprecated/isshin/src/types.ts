import { LoaderFunctionArgs } from 'react-router';

export type TLoaderFunction<GResponse = null> = (args: LoaderFunctionArgs) => Promise<GResponse>;
