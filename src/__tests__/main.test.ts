import { TermRelationships } from '../types';
import { asTerm } from '../utils';
import { buildHierarchy, getTermRelationships } from '../main';

describe('buildHierarchy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('correct result', async () => {
    const termRelationshipRoot: TermRelationships = { term: asTerm('term_1'), ancestors: {} };
    const termRelationship2: TermRelationships = {
      term: asTerm('term_2'),
      ancestors: { [termRelationshipRoot.term.value]: true },
    };

    const termRelationship3: TermRelationships = {
      term: asTerm('term_3'),
      ancestors: { [termRelationship2.term.value]: true },
    };

    const result = buildHierarchy(termRelationshipRoot, [termRelationshipRoot, termRelationship2, termRelationship3]);

    expect(result).toMatchSnapshot();
  });
});

describe('getTermRelationships', () => {
  const mockApi = {
    getAncestralEdges: jest.fn(),
    isParentOfATerm: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('correct result', async () => {
    const edge1 = {
      end: {
        term: 'term_1',
      },
    };

    const edge2 = {
      end: {
        term: 'term_2',
      },
    };

    const edge3 = {
      end: {
        term: 'term_3',
      },
    };

    mockApi.getAncestralEdges.mockResolvedValueOnce([edge1, edge2, edge3]);

    mockApi.isParentOfATerm.mockImplementation((args) => {
      if (args.parent.value === edge1.end.term && args.child.value === edge2.end.term) {
        return true;
      }

      if (args.parent.value === edge2.end.term && args.child.value === edge3.end.term) {
        return true;
      }

      return false;
    });

    const term = asTerm('term');

    const result = await getTermRelationships({ api: mockApi })(term);

    expect(result).toMatchSnapshot();
  });
});
