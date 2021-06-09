import process from 'process';
import util from 'util';

import { getApi } from './api';
import { Term, TermRelationships, Relationships, ConceptNetApi } from './types';
import { asTerm, conceptToTerm } from './utils';

export const getTermRelationships =
  (deps: { api: ConceptNetApi } = { api: getApi() }) =>
  async (term: Term) => {
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

export const buildHierarchy = (root: TermRelationships, termRelationships: Array<TermRelationships>): Relationships => {
  const child = termRelationships.find((x) => x.ancestors[root.term.value]);

  return {
    [root.term.value]: child ? buildHierarchy(child, termRelationships) : {},
  };
};

export async function findConceptHierarchiesForConcept(concept: string) {
  const term = conceptToTerm(concept);
  const termRelationships = await getTermRelationships()(term);
  const roots = termRelationships.filter((x) => Object.keys(x.ancestors).length === 0);

  if (roots.length === 0) {
    throw new Error('No root nodes were found');
  }

  const chains = roots.map((x) => buildHierarchy(x, termRelationships));
  return chains;
}

export async function main() {
  const [, , concept] = process.argv;
  if (!concept) {
    throw new Error('Please provide a concept you want to lookup as an argument to the program');
  }
  console.log(`Looking up concept hierarchy for ${concept}`);

  const chains = await findConceptHierarchiesForConcept(concept);
  console.log(util.inspect(chains, { depth: 15 }));
}
