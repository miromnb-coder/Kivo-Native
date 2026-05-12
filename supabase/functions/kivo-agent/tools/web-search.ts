export async function runWebSearch(input: { query: string }) {
  return {
    connected: false,
    query: input.query,
    results: [],
    message: 'web_search is not connected yet. The agent must not claim that live web search was used.',
  };
}
