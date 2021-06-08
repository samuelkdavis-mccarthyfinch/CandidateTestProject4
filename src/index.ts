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
interface TermRelationships {
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
  edgesBetweenChildAndParent: (args: { parent: Term; child: Term }) =>
    `http://api.conceptnet.io/query?start=${encodeURIComponent(args.child.value)}&end=${encodeURIComponent(
      args.parent.value,
    )}&rel=/r/IsA`,
};

const getDataFromApi = async (url: string): Promise<ConceptNetResponse> => {
  const response = await fetch(url);
  const result = (await response.json()) as ConceptNetResponse;
  return result;
};

const getAncestralEdges = async (term: Term) => {
  const data = await getDataFromApi(urlGenerator.termAncestors(term));
  const edges = data.edges.filter((x) => x.rel['@id'] === RelationId.IsA);
  return edges;
};

const isParentOfATerm = async (args: { parent: Term; child: Term }) => {
  const data = await getDataFromApi(urlGenerator.edgesBetweenChildAndParent(args));
  return data.edges.length > 0;
};

const buildHierarchy = (root: TermRelationships, termRelationships: Array<TermRelationships>): Relationships => {
  const child = termRelationships.find((x) => x.ancestors[root.term.value]);

  return {
    [root.term.value]: child ? buildHierarchy(child, termRelationships) : {},
  };
};

const getTermRelationships = async (term: Term) => {
  const edges = await getAncestralEdges(term);
  const termRelationships: Array<TermRelationships> = edges.map((x) => {
    return {
      term: asTerm(x.end.term),
      ancestors: {},
    };
  });

  for (const parentTerm of termRelationships) {
    for (const childTerm of termRelationships) {
      if (parentTerm === childTerm) {
        continue;
      }

      if (
        await isParentOfATerm({
          parent: parentTerm.term,
          child: childTerm.term,
        })
      ) {
        childTerm.ancestors[parentTerm.term.value] = true;
      }
    }
  }

  termRelationships.push({
    term: term,
    ancestors: edges.reduce(
      (sum: Record<string, boolean>, x) => ({
        ...sum,
        [x.end.term]: true,
      }),
      {} as Record<string, boolean>,
    ),
  });

  return termRelationships;
};

async function main() {
  const [, , concept] = process.argv;
  console.log(`Looking up concept hierarchy for ${concept}`);

  const term = conceptToTerm(concept);
  const termRelationships = await getTermRelationships(term);
  const roots = termRelationships.filter((x) => Object.keys(x.ancestors).length === 0);
  if (roots.length === 0) {
    throw new Error('No root nodes were found');
  }

  const chains = roots.map((x) => buildHierarchy(x, termRelationships));

  console.log(util.inspect(chains, { depth: 15 }));
}

main().catch((e) => console.error(e));
