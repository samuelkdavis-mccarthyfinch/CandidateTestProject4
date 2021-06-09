import { termSymbol } from './constants';

export interface Term {
  value: string;
  [termSymbol]: true;
}

export interface ConceptNode {
  '@id': string;
  '@type': NodeType.Node;
  label: string;
  language: Language;
  sense_label: string;
  term: string;
}

export interface Relation {
  '@id': RelationId;
  '@type': NodeType.Relation;
  label: string;
}

export interface Edge {
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

export enum RelationId {
  IsA = '/r/IsA',
}

export enum Language {
  English = 'en',
}

export enum NodeType {
  Relation = 'Relation',
  Edge = 'Edge',
  Node = 'Node',
}

export interface TermRelationships {
  term: Term;
  ancestors: Record<string, boolean>;
}

export interface Relationships {
  [key: string]: Relationships;
}

export interface ConceptNetApi {
  getAncestralEdges: (term: Term) => Promise<Array<Edge>>;
  isParentOfATerm: (args: { parent: Term; child: Term }) => Promise<boolean>;
}
