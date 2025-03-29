import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Brain, Loader2, BookMarked, Share2, Download, TrendingUp, Globe, BookCopy } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';

// Initialize Supabase client with fallback empty string to prevent runtime errors
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

function App() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [view, setView] = useState('search'); // 'search' or 'detail'
  const [searchType, setSearchType] = useState('all'); // 'all', 'research', 'web'
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  useEffect(() => {
    fetchTrendingSearches();
  }, []);

  const fetchTrendingSearches = async () => {
    setIsLoadingTrends(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/search-papers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'trends' }),
      });
      
      const data = await response.json();
      setTrendingSearches(data.trends || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const searchPapers = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/search-papers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, type: searchType }),
      });
      
      const data = await response.json();
      setPapers(data.papers || []);
      setView('search');
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePaperSelect = (paper: any) => {
    setSelectedPaper(paper);
    setView('detail');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-12">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-black rounded-lg px-6 py-4">
              <Brain className="w-12 h-12 text-blue-400 mr-4" />
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Exus Research
              </h1>
            </div>
          </div>
        </div>

        {/* Search Type Selector */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setSearchType('all')}
              className={`px-4 py-2 rounded-md flex items-center ${
                searchType === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Search className="w-4 h-4 mr-2" />
              All
            </button>
            <button
              onClick={() => setSearchType('research')}
              className={`px-4 py-2 rounded-md flex items-center ${
                searchType === 'research' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <BookCopy className="w-4 h-4 mr-2" />
              Research
            </button>
            <button
              onClick={() => setSearchType('web')}
              className={`px-4 py-2 rounded-md flex items-center ${
                searchType === 'web' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Globe className="w-4 h-4 mr-2" />
              Web
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-gray-900 rounded-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPapers(query)}
                placeholder={`Search ${searchType === 'research' ? 'research papers' : searchType === 'web' ? 'the web' : 'everything'}...`}
                className="w-full pl-12 pr-32 py-4 bg-transparent text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                onClick={() => searchPapers(query)}
                disabled={isSearching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Trending Searches */}
        {view === 'search' && trendingSearches.length > 0 && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Trending Searches</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((trend: any, index: number) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(trend.query);
                    searchPapers(trend.query);
                  }}
                  className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition"
                >
                  {trend.query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {view === 'search' ? (
            // Search Results
            <div className="space-y-6">
              {papers.map((paper: any, index: number) => (
                <div
                  key={index}
                  className="group relative"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative p-6 bg-gray-900 rounded-lg hover:bg-gray-800/80 transition duration-300">
                    <div className="flex items-start">
                      {paper.type === 'research' ? (
                        <BookOpen className="w-6 h-6 text-blue-400 mr-4 mt-1 flex-shrink-0" />
                      ) : (
                        <Globe className="w-6 h-6 text-green-400 mr-4 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition">
                            {paper.title}
                          </h2>
                          <span className="text-sm text-gray-400 ml-4">{paper.source}</span>
                        </div>
                        <p className="text-gray-400 mb-4">{paper.authors?.join(', ')}</p>
                        <p className="text-gray-300 line-clamp-3">{paper.abstract}</p>
                        <div className="mt-4 flex items-center space-x-4">
                          <button
                            onClick={() => handlePaperSelect(paper)}
                            className="flex items-center text-blue-400 hover:text-blue-300 transition"
                          >
                            <BookMarked className="w-4 h-4 mr-2" />
                            Read More
                          </button>
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-purple-400 hover:text-purple-300 transition"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            View Source
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Paper Detail View
            selectedPaper && (
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-25"></div>
                <div className="relative p-8 bg-gray-900 rounded-lg">
                  <button
                    onClick={() => setView('search')}
                    className="mb-6 text-blue-400 hover:text-blue-300 transition flex items-center"
                  >
                    ← Back to results
                  </button>
                  <div className="flex justify-between items-start mb-4">
                    <h1 className="text-2xl font-bold text-white">{selectedPaper.title}</h1>
                    <span className="text-sm text-gray-400 ml-4">{selectedPaper.source}</span>
                  </div>
                  <p className="text-gray-400 mb-6">{selectedPaper.authors?.join(', ')}</p>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{selectedPaper.abstract}</ReactMarkdown>
                  </div>
                  <div className="mt-8 flex items-center space-x-6">
                    <a
                      href={selectedPaper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      View Source
                    </a>
                    {selectedPaper.source === 'arXiv' && (
                      <a
                        href={`${selectedPaper.url}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default App;