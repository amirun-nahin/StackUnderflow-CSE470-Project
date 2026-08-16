import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const RECENT_SEARCHES_KEY_PREFIX = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;

// Pages where the search shortcut should not activate at all.
const DISABLED_PATHS = ['/login', '/register'];
// Recent searches are namespaced per logged-in username so they persist
// across logout/login for the SAME account, but never leak between accounts
// sharing the same browser.
function recentSearchesKey() {
    const username = localStorage.getItem('username') || 'anonymous';
    return `${RECENT_SEARCHES_KEY_PREFIX}:${username}`;
}
// Splits a raw query like "react #bounty" into { text: "react", tag: "bounty" }.
// Only the first "#token" is used as the tag.
function parseQuery(raw) {
    const tagMatch = raw.match(/#(\S+)/);
    const tag = tagMatch ? tagMatch[1] : '';
    const text = raw.replace(/#\S+/g, '').trim();
    return { text, tag };
}

function loadRecentSearches() {
    try {
        const stored = JSON.parse(localStorage.getItem(recentSearchesKey()));
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

function saveRecentSearch(term) {
    const existing = loadRecentSearches().filter((t) => t !== term);
    const updated = [term, ...existing].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(recentSearchesKey(), JSON.stringify(updated));
    return updated;
}

const SCOPE_LABEL = { competition: 'Competitions', group: 'Groups', message: 'Messages', post: 'Posts' };
const SCOPE_NOUN = { competition: 'competitions', group: 'groups', message: 'messages', post: 'posts' };

const SearchBar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [rawQuery, setRawQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mainResults, setMainResults] = useState([]);
    const [topOffset, setTopOffset] = useState(72);
    const [userResults, setUserResults] = useState([]);

    const isDisabledPage = DISABLED_PATHS.includes(location.pathname);
    // Which content type a search targets depends on the page you're on.
    const scope =
        location.pathname === '/challenges' ? 'competition' :
        location.pathname === '/groups' ? 'group' :
        location.pathname === '/chat' ? 'message' :
        'post';
    // The secondary "Users" lookup only makes sense for the general post/competition
    // pages — group and message search are already about people/groups directly.
    const showUserResults = scope === 'post' || scope === 'competition';

    const closeSearch = useCallback(() => {
        setIsOpen(false);
        setHasSearched(false);
        setMainResults([]);
        setUserResults([]);
        setRawQuery('');
    }, []);
    useEffect(() => {
        const nav = document.querySelector('.navbar');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (nav) setTopOffset(nav.getBoundingClientRect().height);
    }, []);
    // Ctrl+F / Cmd+F opens the bar (and refocuses it if already open); Esc closes it.
    useEffect(() => {
        if (isDisabledPage) return;

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setIsOpen(true);
                inputRef.current?.focus();
            } else if (e.key === 'Escape' && isOpen) {
                closeSearch();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDisabledPage, isOpen, closeSearch]);

    // Force-close if the user navigates to a page the search bar shouldn't run on
    // (the render guard at the bottom also hides it, but this clears stale state).
    if (isDisabledPage && isOpen) {
        closeSearch();
    }

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const runSearch = async (queryOverride) => {
        const query = (queryOverride ?? rawQuery).trim();
        if (!query) return;

        const { text, tag } = parseQuery(query);
        if (!text && !tag) return;

        setLoading(true);
        setHasSearched(true);
        setRawQuery(query);

        const token = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ type: scope, q: text, tag });

        try {
            const requests = [
                fetch(`http://localhost:3001/api/search?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ];
            // Users are searched by username only — skip for group/message pages
            // (already people-centric) and for pure #tag queries.
            if (text && showUserResults) {
                requests.push(
                    fetch(`http://localhost:3001/api/search?${new URLSearchParams({ type: 'user', q: text }).toString()}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                );
            }

            const responses = await Promise.all(requests);
            const [mainData, userData] = await Promise.all(responses.map((r) => r.json()));

            setMainResults(mainData?.results || []);
            setUserResults(userData?.results || []);
            setRecentSearches(saveRecentSearch(query));
        } catch (error) {
            console.error('Search failed', error);
            setMainResults([]);
            setUserResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        runSearch();
    };

    const goToPost = (result) => {
        closeSearch();
        navigate(result.category === 'MICRO_BOUNTY' ? `/bounty/${result.id}` : `/post/${result.id}`);
    };

    const goToCompetition = (result) => {
        closeSearch();
        navigate(`/competition/${result.id}`);
    };

    const goToUser = (result) => {
        closeSearch();
        navigate(`/profile/${result.username}`);
    };
    const goToGroup = (result) => {
        closeSearch();
        navigate(`/group/${result.id}`);
    };

    const goToMessage = (result) => {
        closeSearch();
        navigate('/chat', { state: { openUser: { id: result.otherUserId, username: result.otherUsername } } });
    };


    if (isDisabledPage || !isOpen) return null;

    return (
        <div className="search-bar-wrapper" style={{ top: topOffset }}>
            <div className="search-bar-panel">
                <form className="search-bar-input-row" onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        className="select-input"
                        placeholder={`Search ${SCOPE_NOUN[scope]}... try "react" or "#bounty"`}
                        value={rawQuery}
                        onChange={(e) => setRawQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Search</button>
                    <button type="button" className="modal-close-btn" onClick={closeSearch} aria-label="Close search">✕</button>
                </form>

                {recentSearches.length > 0 && (
                    <div className="search-recent-row">
                        <span className="search-recent-label">Recent:</span>
                        {recentSearches.map((term) => (
                            <button
                                key={term}
                                type="button"
                                className="search-recent-chip"
                                onClick={() => runSearch(term)}
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                )}

                {hasSearched && (
                    <div className="search-results-panel">
                        {loading ? (
                            <p className="profile-field__value profile-field__value--muted">Searching...</p>
                        ) : (
                            <>
                                {userResults.length > 0 && showUserResults && (
                                    <>
                                        <p className="search-section-title">Users</p>
                                        <div className="search-results-list">
                                            {userResults.map((u) => (
                                                <div
                                                    key={`user-${u.id}`}
                                                    className="search-result-item"
                                                    onClick={() => goToUser(u)}
                                                >
                                                    <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                                    <div>
                                                        <p className="search-result-item__title">{u.username}</p>
                                                        {u.name && <p className="search-result-item__snippet">{u.name}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <p className="search-section-title">
                                    {SCOPE_LABEL[scope]}
                                </p>
                                {mainResults.length === 0 ? (
                                    <p className="empty-state">No results found.</p>
                                ) : (
                                    <div className="search-results-list">
                                        {mainResults.map((r) => {
                                            if (r.type === 'competition') {
                                                return (
                                                    <div
                                                        key={`comp-${r.id}`}
                                                        className="search-result-item"
                                                        onClick={() => goToCompetition(r)}
                                                    >
                                                        <div className="avatar-circle avatar-circle--sm">🏁</div>
                                                        <div>
                                                            <p className="search-result-item__title">{r.title}</p>
                                                            <p className="search-result-item__snippet">
                                                                {r.description ? `${r.description.slice(0, 60)}${r.description.length > 60 ? '...' : ''}` : new Date(r.start_time).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (r.type === 'group') {
                                                return (
                                                    <div
                                                        key={`group-${r.id}`}
                                                        className="search-result-item"
                                                        onClick={() => goToGroup(r)}
                                                    >
                                                        <div className="avatar-circle avatar-circle--sm">👥</div>
                                                        <div>
                                                            <p className="search-result-item__title">
                                                                {r.name} {r.is_private ? '🔒' : ''}
                                                            </p>
                                                            <p className="search-result-item__snippet">
                                                                {r.description ? `${r.description.slice(0, 60)}${r.description.length > 60 ? '...' : ''}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (r.type === 'message') {
                                                return (
                                                    <div
                                                        key={`msg-${r.id}`}
                                                        className="search-result-item"
                                                        onClick={() => goToMessage(r)}
                                                    >
                                                        <div className="avatar-circle avatar-circle--sm">💬</div>
                                                        <div>
                                                            <p className="search-result-item__title">{r.otherUsername || 'Unknown User'}</p>
                                                            <p className="search-result-item__snippet">
                                                                {r.text_content ? `${r.text_content.slice(0, 60)}${r.text_content.length > 60 ? '...' : ''}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div
                                                    key={`post-${r.id}`}
                                                    className="search-result-item"
                                                    onClick={() => goToPost(r)}
                                                >
                                                    <div className="avatar-circle avatar-circle--sm">🧑‍💻</div>
                                                    <div>
                                                        <p className="search-result-item__title">{r.username || 'Unknown User'}</p>
                                                        <p className="search-result-item__snippet">
                                                            {r.text_content ? `${r.text_content.slice(0, 60)}${r.text_content.length > 60 ? '...' : ''}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchBar;