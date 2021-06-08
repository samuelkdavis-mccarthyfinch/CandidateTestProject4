import process from 'process';
import util from 'util';
import fetch from 'node-fetch';

const termSymbol = Symbol('term');
interface Term {
  value: string;
  [termSymbol]: true;
}

interface ConceptNode {
  '@id': string;
  '@type': NodeType.Node;
  label: string;
  language: Language;
  sense_label: string;
  term: string;
}

interface Relation {
  '@id': RelationId;
  '@type': NodeType.Relation;
  label: string;
}

interface Edge {
  '@id': string;
  '@type': NodeType.Edge;
  dataset: string;
  end: ConceptNode;
  license: string;
  rel: Relation;
  sources: Array<Object>;
  start: ConceptNode;
  surfaceText: null;
  weight: number;
}

type ConceptNetResponse = {
  edges: Array<Edge>;
};

enum RelationId {
  IsA = '/r/IsA',
}

enum Language {
  English = 'en',
}

enum NodeType {
  Relation = 'Relation',
  Edge = 'Edge',
  Node = 'Node',
}
interface Intermediate {
  term: Term;
  ancestors: Record<string, boolean>;
}

interface Relationships {
  [key: string]: Relationships;
}

const asTerm = (termString: string): Term => {
  return {
    value: termString,
    [termSymbol]: true,
  };
};

const conceptToTerm = (concept: string, language: string = Language.English): Term => ({
  value: `/c/${language}/${concept.replace(/ /g, '_')}`,
  [termSymbol]: true,
});

const urlGenerator = {
  termAncestors: (term: Term) => `http://api.conceptnet.io/query?start=${encodeURIComponent(term.value)}&rel=/r/IsA`,
  edgesBetweenChildAndParent: (maybeChildTerm: Term, maybeParentTerm: Term) =>
    `http://api.conceptnet.io/query?start=${encodeURIComponent(maybeChildTerm.value)}&end=${encodeURIComponent(
      maybeParentTerm.value,
    )}&rel=/r/IsA`,
};

const getDataFromApi = async (url: string): Promise<ConceptNetResponse> => {
  const response = await fetch(url);
  const result = (await response.json()) as ConceptNetResponse;
  return result;
};

const isParentOfATerm = async (args: { parent: Term; child: Term }) => {
  const data = await getDataFromApi(urlGenerator.edgesBetweenChildAndParent(args.child, args.parent));
  return data.edges.length > 0;
};

const buildHierarchy = (root: Intermediate, intermediates: Array<Intermediate>): Relationships => {
  const child = intermediates.find((x) => x.ancestors[root.term.value]);
  if (!child) {
    return {
      [root.term.value]: {},
    };
  }

  return {
    [root.term.value]: buildHierarchy(child, intermediates),
  };
};

const getIntermediaryNodes = async (term: Term) => {
  const data = await getDataFromApi(urlGenerator.termAncestors(term));
  const edges = data.edges.filter((x) => x.rel['@id'] === RelationId.IsA);
  const intermediates: Array<Intermediate> = edges.map((x) => {
    return {
      term: asTerm(x.end.term),
      ancestors: {},
    };
  });

  for (const m of intermediates) {
    for (const innerEdgeTerm of intermediates) {
      if (m === innerEdgeTerm) {
        continue;
      }

      if (
        await isParentOfATerm({
          child: innerEdgeTerm.term,
          parent: m.term,
        })
      ) {
        innerEdgeTerm.ancestors[m.term.value] = true;
      }
    }
  }

  intermediates.push({
    term: term,
    ancestors: edges.reduce(
      (sum: Record<string, boolean>, x) => ({
        ...sum,
        [x.end.term]: true,
      }),
      {} as Record<string, boolean>,
    ),
  });

  return intermediates;
};

async function main() {
  const [, , concept] = process.argv;
  console.log(`Looking up concept hierarchy for ${concept}`);

  const term = conceptToTerm(concept);
  const intermediaries = await getIntermediaryNodes(term);
  const roots = intermediaries.filter((x) => Object.keys(x.ancestors).length === 0);
  const chains = roots.map((x) => buildHierarchy(x, intermediaries));

  console.log(util.inspect(chains, { depth: 15 }));
}

main().catch((e) => console.error(e));
