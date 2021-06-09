import { ConceptNetResponse, getApi } from '../api';
import fetch from 'node-fetch';
import { RelationId, Term } from '../types';
import { asTerm } from '../utils';

describe('api', () => {
  const mockFetch = jest.fn();
  const api = getApi({ fetch: mockFetch as unknown as typeof fetch });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getAncestralEdges', () => {
    test('correct result', async () => {
      const mockResponse = {
        edges: [
          {
            '@id': '1',
            rel: {
              '@id': RelationId.IsA,
            },
          },
          {
            '@id': '2',
            rel: {
              '@id': 'wrong',
            },
          },
          {
            '@id': '3',
            rel: {
              '@id': RelationId.IsA,
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const term = asTerm('mock_term');
      const result = await api.getAncestralEdges(term);
      expect(mockFetch.mock.calls).toMatchSnapshot();
      expect(result).toMatchSnapshot();
    });
  });

  describe('isParentOfATerm', () => {
    test('yes', async () => {
      const mockResponse = {
        edges: [
          {
            '@id': '1',
            rel: {
              '@id': RelationId.IsA,
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const term1 = asTerm('mock_term_1');
      const term2 = asTerm('mock_term_1');
      const result = await api.isParentOfATerm({ child: term1, parent: term2 });
      expect(mockFetch.mock.calls).toMatchSnapshot();
      expect(result).toBe(true);
    });

    test('no', async () => {
      const mockResponse = {
        edges: [],
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const term1 = asTerm('mock_term_1');
      const term2 = asTerm('mock_term_1');
      const result = await api.isParentOfATerm({ child: term1, parent: term2 });
      expect(mockFetch.mock.calls).toMatchSnapshot();
      expect(result).toBe(false);
    });
  });
});
