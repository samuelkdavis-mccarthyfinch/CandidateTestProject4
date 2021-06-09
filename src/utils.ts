import { termSymbol } from './constants';
import { Term, Language } from './types';

export const asTerm = (termString: string): Term => {
  return {
    value: termString,
    [termSymbol]: true,
  };
};

export const conceptToTerm = (concept: string, language: string = Language.English): Term => ({
  value: `/c/${language}/${concept.replace(/ /g, '_')}`,
  [termSymbol]: true,
});
