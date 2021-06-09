import process from 'process';
import util from 'util';

import { getApi } from './api';
import { Term, TermRelationships, Relationships, ConceptNetApi } from './types';
import { asTerm, conceptToTerm } from './utils';

const getTermRelationships = (deps: { api: ConceptNetApi }) => async (term: Term) => {
  const edges = await deps.api.getAncestralEdges(term);
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
        await deps.api.isParentOfATerm({
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

const buildHierarchy = (root: TermRelationships, termRelationships: Array<TermRelationships>): Relationships => {
  const child = termRelationships.find((x) => x.ancestors[root.term.value]);

  return {
    [root.term.value]: child ? buildHierarchy(child, termRelationships) : {},
  };
};

async function main() {
  const [, , concept] = process.argv;
  console.log(`Looking up concept hierarchy for ${concept}`);

  const term = conceptToTerm(concept);
  const termRelationships = await getTermRelationships({ api: getApi() })(term);
  const roots = termRelationships.filter((x) => Object.keys(x.ancestors).length === 0);
  if (roots.length === 0) {
    throw new Error('No root nodes were found');
  }

  const chains = roots.map((x) => buildHierarchy(x, termRelationships));

  console.log(util.inspect(chains, { depth: 15 }));
}

main().catch((e) => console.error(e));
