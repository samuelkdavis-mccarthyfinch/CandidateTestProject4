import process from 'process';
import fetch from 'node-fetch';

const getUrl = (concept: string) => `http://api.conceptnet.io/c/en/${concept}`;

const getData = async (concept: string) => {
  const url = getUrl(concept);
  const response = await fetch(url);
  const result = await response.json();
  return result;
};

async function main() {
  const [, , concept] = process.argv;
  await getData(concept);
}

main().catch((e) => console.error(e));
