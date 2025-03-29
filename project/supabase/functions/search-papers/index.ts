import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { parseString } from 'npm:xml2js@0.6.2';
import { promisify } from 'node:util';

const parseXml = promisify(parseString);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys should be set in Supabase's Edge Function secrets
const BING_API_KEY = Deno.env.get('BING_API_KEY') || '';
const GOOGLE_CSE_KEY = Deno.env.get('GOOGLE_CSE_KEY') || '';
const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID') || '';
const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY') || '';
const GOOGLE_BOOKS_KEY = Deno.env.get('GOOGLE_BOOKS_KEY') || '';
const LOC_API_KEY = Deno.env.get('LOC_API_KEY') || '';
const NCBI_API_KEY = Deno.env.get('NCBI_API_KEY') || '';
const SCIENCEGOV_API_KEY = Deno.env.get('SCIENCEGOV_API_KEY') || '';
const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID') || '';
const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET') || '';
const JSTOR_API_KEY = Deno.env.get('JSTOR_API_KEY') || '';

// Research Sources
async function searchScienceGov(query: string) {
  try {
    const url = `https://www.science.gov/api/v1/search?query=${encodeURIComponent(query)}&api_key=${SCIENCEGOV_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.results || []).map((item: any) => ({
      title: item.title || '',
      abstract: item.description || '',
      authors: item.authors || [],
      url: item.link || '',
      published: item.publicationDate || '',
      source: 'Science.gov',
      type: 'research',
      agency: item.agency || '',
      contentType: item.contentType || ''
    }));
  } catch (error) {
    console.error('Science.gov error:', error);
    return [];
  }
}

async function searchResearchGate(query: string) {
  try {
    const url = `https://www.researchgate.net/api/search?q=${encodeURIComponent(query)}&type=publication`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.title || '',
      abstract: item.abstract || '',
      authors: item.authors?.map((author: any) => author.name) || [],
      url: `https://www.researchgate.net${item.path}`,
      published: item.publishedDate || '',
      source: 'ResearchGate',
      type: 'research',
      citations: item.citationCount || 0,
      reads: item.readCount || 0
    }));
  } catch (error) {
    console.error('ResearchGate error:', error);
    return [];
  }
}

async function searchArxiv(query: string) {
  try {
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10&sortBy=relevance&sortOrder=descending`;
    const response = await fetch(arxivUrl);
    const xmlText = await response.text();

    const papers = xmlText.split('<entry>').slice(1).map(entry => {
      const title = entry.match(/<title>(.*?)<\/title>/s)?.[1]?.replace(/\s+/g, ' ') || '';
      const abstract = entry.match(/<summary>(.*?)<\/summary>/s)?.[1]?.replace(/\s+/g, ' ') || '';
      const authors = entry.match(/<author>(.*?)<\/author>/g)?.map(
        author => author.match(/<name>(.*?)<\/name>/)?.[1]?.trim() || ''
      ) || [];
      const url = entry.match(/<id>(.*?)<\/id>/)?.[1] || '';
      const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || '';

      return {
        title: title.trim(),
        abstract: abstract.trim(),
        authors,
        url,
        published: new Date(published).toLocaleDateString(),
        source: 'arXiv',
        type: 'research'
      };
    });
    return papers;
  } catch (error) {
    console.error('arXiv error:', error);
    return [];
  }
}

async function searchPubMed(query: string) {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&api_key=${NCBI_API_KEY}`;
    const searchResponse = await fetch(searchUrl);
    const searchText = await searchResponse.text();
    const searchResult = await parseXml(searchText);
    
    const ids = searchResult.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json&api_key=${NCBI_API_KEY}`;
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();

    return Object.values(summaryData.result || {})
      .filter((item: any) => item.uid)
      .map((item: any) => ({
        title: item.title || '',
        abstract: item.abstract || '',
        authors: item.authors?.map((author: any) => author.name) || [],
        url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
        published: item.pubdate || '',
        source: 'PubMed',
        type: 'research',
        journal: item.fulljournalname || '',
        pmid: item.uid
      }));
  } catch (error) {
    console.error('PubMed error:', error);
    return [];
  }
}

async function searchLibraryOfCongress(query: string) {
  try {
    const url = `https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fo=json&c=10${LOC_API_KEY ? `&api_key=${LOC_API_KEY}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.results || []).map((item: any) => ({
      title: item.title || '',
      abstract: item.description?.[0] || '',
      authors: item.contributors?.map((contributor: any) => contributor.name) || [],
      url: item.url || '',
      published: item.date || '',
      source: 'Library of Congress',
      type: 'research',
      format: item.original_format?.[0] || '',
      subjects: item.subject || []
    }));
  } catch (error) {
    console.error('Library of Congress error:', error);
    return [];
  }
}

async function searchDigitalCommons(query: string) {
  try {
    const url = `https://network.bepress.com/api/search/articles?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.results || []).map((item: any) => ({
      title: item.title || '',
      abstract: item.description || '',
      authors: item.authors || [],
      url: item.url || '',
      published: item.published_date || '',
      source: 'Digital Commons Network',
      type: 'web',
      institution: item.institution || '',
      downloads: item.download_count || 0
    }));
  } catch (error) {
    console.error('Digital Commons error:', error);
    return [];
  }
}

async function searchReddit(query: string) {
  try {
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenResponse.json();
    
    const searchResponse = await fetch(
      `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&type=link&sort=relevance&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'ExusResearch/1.0'
        }
      }
    );
    const searchData = await searchResponse.json();
    
    return searchData.data.children.map((post: any) => ({
      title: post.data.title || '',
      abstract: post.data.selftext || '',
      authors: [post.data.author],
      url: `https://reddit.com${post.data.permalink}`,
      published: new Date(post.data.created_utc * 1000).toLocaleDateString(),
      source: 'Reddit',
      type: 'web',
      subreddit: post.data.subreddit_name_prefixed,
      score: post.data.score,
      comments: post.data.num_comments
    }));
  } catch (error) {
    console.error('Reddit error:', error);
    return [];
  }
}

async function searchWikipedia(query: string) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=10&origin=*`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    const pageIds = searchData.query?.search?.map((result: any) => result.pageid) || [];

    if (pageIds.length === 0) return [];

    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&pageids=${pageIds.join('|')}&prop=extracts|info|categories|links&exintro=1&explaintext=1&inprop=url&cllimit=5&pllimit=5&origin=*`;
    const contentResponse = await fetch(contentUrl);
    const contentData = await contentResponse.json();
    
    return Object.values(contentData.query?.pages || {}).map((page: any) => ({
      title: page.title || '',
      abstract: page.extract || '',
      authors: [],
      url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      published: '',
      categories: page.categories?.map((cat: any) => cat.title.replace('Category:', '')) || [],
      source: 'Wikipedia',
      type: 'web'
    }));
  } catch (error) {
    console.error('Wikipedia error:', error);
    return [];
  }
}

async function searchGoogleBooks(query: string) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_KEY}&maxResults=10`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.items || []).map((item: any) => {
      const volumeInfo = item.volumeInfo || {};
      return {
        title: volumeInfo.title || '',
        abstract: volumeInfo.description || '',
        authors: volumeInfo.authors || [],
        url: volumeInfo.infoLink || '',
        published: volumeInfo.publishedDate || '',
        source: 'Google Books',
        type: 'web',
        publisher: volumeInfo.publisher || '',
        categories: volumeInfo.categories || [],
        pageCount: volumeInfo.pageCount,
        previewLink: volumeInfo.previewLink
      };
    });
  } catch (error) {
    console.error('Google Books error:', error);
    return [];
  }
}

async function searchGoogleScholar(query: string) {
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&num=10`,
      {
        headers: { 'Accept': 'application/json' },
      }
    );
    const data = await response.json();
    
    return (data.organic_results || []).map((result: any) => ({
      title: result.title || '',
      abstract: result.snippet || result.publication_info?.summary || '',
      authors: (result.publication_info?.authors || []).map((author: string) => author.trim()),
      url: result.link || '',
      published: result.publication_info?.year || '',
      source: 'Google Scholar',
      type: 'web',
      citations: result.inline_links?.cited_by?.total || 0,
      venue: result.publication_info?.venue || ''
    }));
  } catch (error) {
    console.error('Google Scholar error:', error);
    return [];
  }
}

async function searchJSTOR(query: string) {
  try {
    const url = `https://www.jstor.org/api/search-results?Query=${encodeURIComponent(query)}&limit=10&apikey=${JSTOR_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.title || '',
      abstract: item.abstract || '',
      authors: item.authors?.map((author: any) => author.name) || [],
      url: item.stableUrl || '',
      published: item.publicationDate || '',
      source: 'JSTOR',
      type: 'web',
      journal: item.journal?.name || '',
      publisher: item.publisher || ''
    }));
  } catch (error) {
    console.error('JSTOR error:', error);
    return [];
  }
}

async function getTrendingSearches() {
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_trends&api_key=${SERPAPI_KEY}&data_type=TIMESERIES&geo=US`,
      {
        headers: { 'Accept': 'application/json' },
      }
    );
    const data = await response.json();
    return data.daily_trends || [];
  } catch (error) {
    console.error('Trending searches error:', error);
    return [];
  }
}

function normalizeResults(results: any[], source: string, type: 'research' | 'web' = 'web') {
  return results.map(result => ({
    title: result.title || result.name || '',
    abstract: result.snippet || result.description || result.summary || '',
    authors: result.authors || [],
    url: result.link || result.url || '',
    published: result.published || result.datePublished || new Date().toLocaleDateString(),
    source,
    type
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type = 'all' } = await req.json();

    if (type === 'trends') {
      const trends = await getTrendingSearches();
      return new Response(
        JSON.stringify({ trends }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let results = [];
    
    if (type === 'web') {
      const [
        wikipediaResults, 
        scholarResults, 
        booksResults, 
        digitalCommonsResults, 
        redditResults,
        scienceGovResults,
        jstorResults
      ] = await Promise.all([
        searchWikipedia(query),
        searchGoogleScholar(query),
        searchGoogleBooks(query),
        searchDigitalCommons(query),
        searchReddit(query),
        searchScienceGov(query),
        searchJSTOR(query)
      ]);
      results = [
        ...wikipediaResults,
        ...scholarResults,
        ...booksResults,
        ...digitalCommonsResults,
        ...redditResults,
        ...scienceGovResults,
        ...jstorResults
      ];
    } 
    else if (type === 'research') {
      const [arxivResults, pubmedResults, locResults, researchGateResults] = await Promise.all([
        searchArxiv(query),
        searchPubMed(query),
        searchLibraryOfCongress(query),
        searchResearchGate(query)
      ]);
      results = [...arxivResults, ...pubmedResults, ...locResults, ...researchGateResults];
    }
    else {
      const [
        arxivResults,
        pubmedResults,
        locResults,
        researchGateResults,
        wikipediaResults,
        scholarResults,
        booksResults,
        digitalCommonsResults,
        redditResults,
        scienceGovResults,
        jstorResults
      ] = await Promise.all([
        searchArxiv(query),
        searchPubMed(query),
        searchLibraryOfCongress(query),
        searchResearchGate(query),
        searchWikipedia(query),
        searchGoogleScholar(query),
        searchGoogleBooks(query),
        searchDigitalCommons(query),
        searchReddit(query),
        searchScienceGov(query),
        searchJSTOR(query)
      ]);

      results = [
        ...arxivResults,
        ...pubmedResults,
        ...locResults,
        ...researchGateResults,
        ...wikipediaResults,
        ...scholarResults,
        ...booksResults,
        ...digitalCommonsResults,
        ...redditResults,
        ...scienceGovResults,
        ...jstorResults
      ];
    }

    const uniqueResults = Array.from(
      new Map(results.map(item => [item.url, item])).values()
    );

    const sortedResults = uniqueResults.sort((a, b) => {
      const queryLower = query.toLowerCase();
      const scoreA = (
        (a.title.toLowerCase().includes(queryLower) ? 3 : 0) +
        (a.abstract.toLowerCase().includes(queryLower) ? 2 : 0) +
        (a.type === 'research' ? 2 : 0) +
        (a.source === 'Wikipedia' ? 1.5 : 0) +
        (a.citations ? Math.min(a.citations / 100, 2) : 0) +
        (a.authors.length > 0 ? 0.5 : 0)
      );
      const scoreB = (
        (b.title.toLowerCase().includes(queryLower) ? 3 : 0) +
        (b.abstract.toLowerCase().includes(queryLower) ? 2 : 0) +
        (b.type === 'research' ? 2 : 0) +
        (b.source === 'Wikipedia' ? 1.5 : 0) +
        (b.citations ? Math.min(b.citations / 100, 2) : 0) +
        (b.authors.length > 0 ? 0.5 : 0)
      );
      return scoreB - scoreA;
    });

    return new Response(
      JSON.stringify({ papers: sortedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch results',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});