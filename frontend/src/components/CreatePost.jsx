import { useState, useEffect } from 'react';

const CreatePost = ({ onPostCreated }) => {
  const [text, setText] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('NORMAL');
  const [language, setLanguage] = useState('General'); // <-- NEW STATE
  const [showCodeInput, setShowCodeInput] = useState(false);
  // const [bountyRewardPoints, setBountyRewardPoints] = useState('');   // ADD
  // const [bountyDeadline, setBountyDeadline] = useState(''); 
  const [repoName, setRepoName] = useState('');
  const [peopleNeeded, setPeopleNeeded] = useState('');
//  const isBounty = category === 'MICRO_BOUNTY';
  const isRepoRequest = category === 'REPO_REQUEST';

  // --- GitHub repo picker (for REPO_REQUEST posts) ---
  const [availableRepos, setAvailableRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState(null); // 'not_connected' | 'fetch_failed' | null
  const [reposFetched, setReposFetched] = useState(false);
  const [repoMode, setRepoMode] = useState('select'); // 'select' | 'custom'

  useEffect(() => {
    if (!isRepoRequest || reposFetched) return;

    const fetchRepos = async () => {
      setReposLoading(true);
      setReposError(null);
      const token = localStorage.getItem('accessToken');

      try {
        const response = await fetch('http://localhost:3001/api/github/repositories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 400) {
          // Not connected — fall back to manual entry
          setReposError('not_connected');
          setRepoMode('custom');
        } else if (!response.ok) {
          setReposError('fetch_failed');
          setRepoMode('custom');
        } else {
          const repos = await response.json();
          setAvailableRepos(repos);
          setRepoMode(repos.length > 0 ? 'select' : 'custom');
        }
      } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        setReposError('fetch_failed');
        setRepoMode('custom');
      } finally {
        setReposLoading(false);
        setReposFetched(true);
      }
    };

    fetchRepos();
  }, [isRepoRequest, reposFetched]);

  const handleRepoSelectChange = (e) => {
    const value = e.target.value;
    if (value === '__custom__') {
      setRepoMode('custom');
      setRepoName('');
    } else {
      setRepoName(value);
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch('http://localhost:3001/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text_content: text,
          code_snippet: showCodeInput ? code : null,
          category: category,
          language: language, // <-- SENDING TO BACKEND
//          ...(isBounty && bountyRewardPoints ? { bounty_reward_points: Number(bountyRewardPoints) } : {}),
//          ...(isBounty && bountyDeadline ? { bounty_deadline: bountyDeadline } : {}),
          ...(isRepoRequest ? { repo_name: repoName, people_needed: Number(peopleNeeded) } : {})
        })
      });

      if (!response.ok) throw new Error('Failed to create post');

      const data = await response.json();
      onPostCreated(data);

      // Reset form
      setText('');
      setCode('');
      setShowCodeInput(false);
      setCategory('NORMAL');
      setLanguage('General');
//      setBountyRewardPoints('');
//      setBountyDeadline('');
      setRepoName('');
      setPeopleNeeded('');
      setRepoMode('select');
      setReposFetched(false);
      setAvailableRepos([]);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <div className="create-post-card panel">
      <form onSubmit={handleSubmit}>

        {/* Side-by-side dropdowns */}
        <div className="create-post-selects">
            <select
              className="select-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="NORMAL">Standard Post</option>
              <option value="PEER_REVIEW">Peer Review Request</option>
              <option value="REPO_REQUEST">Repository Request</option>
            </select>

            <select
              className="select-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="General">General / No Code</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="React">React</option>
              <option value="SQL">SQL</option>
            </select>
        </div>

        {isRepoRequest && (
          <div className="create-post-selects">
            <div className="input-group">
              <label>Repository Name</label>

              {repoMode === 'select' ? (
                <>
                  <select
                    className="select-input"
                    value={repoName}
                    onChange={handleRepoSelectChange}
                    required
                  >
                    <option value="" disabled>
                      {reposLoading ? 'Loading your repositories...' : 'Select a repository'}
                    </option>
                    {availableRepos.map((repo) => (
                      <option key={repo.id} value={repo.full_name}>
                        {repo.full_name}{repo.private ? ' (private)' : ''}
                      </option>
                    ))}
                    <option value="__custom__">Other (type manually)</option>
                  </select>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    className="select-input"
                    placeholder="e.g. octocat/hello-world"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    required
                  />
                  {reposError === 'not_connected' && (
                    <label>
                      GitHub account Not connected.
                    </label>
                  )}
                  {reposError === 'fetch_failed' && (
                    <label>
                      Couldn't load your repositories — enter the name manually.
                    </label>
                  )}
                  {!reposError && availableRepos.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => { setRepoMode('select'); setRepoName(''); }}
                    >
                      Choose from my repos instead
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="input-group">
              <label>People Needed</label>
              <input
                type="number"
                min="1"
                className="select-input"
                placeholder="e.g. 3"
                value={peopleNeeded}
                onChange={(e) => setPeopleNeeded(e.target.value)}
                required
              />
            </div>
          </div>
        )}
        <textarea
          className="post-textarea"
          placeholder={isRepoRequest ? "Briefly describe what you need help with..." : "What is the challenge?"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />

        {showCodeInput && (
          <textarea
            className="code-textarea"
            placeholder="Paste your code snippet here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}

        <div className="create-post-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowCodeInput(!showCodeInput)}
          >
            {showCodeInput ? '- Remove Code' : '+ Add Code Snippet'}
          </button>

          <button type="submit" className="btn btn-primary" disabled={!text || (isRepoRequest && (!repoName.trim() || !peopleNeeded))}>
            Post
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
