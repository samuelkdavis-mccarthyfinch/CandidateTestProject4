import { URL } from 'url';
import PromiseThrottle from 'promise-throttle';
import fetch from 'node-fetch';
import { MAX_REQUESTS_IN_A_MINUTE } from './constants';
import { RelationId, Edge, Term, ConceptNetApi } from './types';

interface Query {
  start?: string;
  end?: string;
  rel?: RelationId;
}

type ConceptNetResponse = {
  edges: Array<Edge>;
};

const getQueryUrl = (query: Query) => {
  const url = new URL('http://api.conceptnet.io/query');
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

const urlGenerator = {
  termAncestors: (term: Term) => getQueryUrl({ start: term.value, rel: RelationId.IsA }),
  edgesBetweenChildAndParent: (args: { parent: Term; child: Term }) =>
    getQueryUrl({ start: args.child.value, end: args.parent.value, rel: RelationId.IsA }),
};

const promiseThrottle = new PromiseThrottle({
  requestsPerSecond: MAX_REQUESTS_IN_A_MINUTE / 60,
  promiseImplementation: Promise,
});

const getDataFromApi = async (url: string): Promise<ConceptNetResponse> => {
  console.log(`Making a request to ${url}`);
  const response = await promiseThrottle.add(() => fetch(url));
  const result = (await response.json()) as ConceptNetResponse;
  return result;
};

export const api: ConceptNetApi = {
  getAncestralEdges: async (term) => {
    const data = await getDataFromApi(urlGenerator.termAncestors(term));
    const edges = data.edges.filter((x) => x.rel['@id'] === RelationId.IsA);
    return edges;
  },
  isParentOfATerm: async (args) => {
    const data = await getDataFromApi(urlGenerator.edgesBetweenChildAndParent(args));
    return data.edges.length > 0;
  },
};
