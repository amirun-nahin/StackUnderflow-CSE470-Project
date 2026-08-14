import { useState } from 'react';

const CreatePost = ({ onPostCreated }) => {
  const [text, setText] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('NORMAL');
  const [language, setLanguage] = useState('General'); // <-- NEW STATE
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [bountyRewardPoints, setBountyRewardPoints] = useState('');   // ADD
  const [bountyDeadline, setBountyDeadline] = useState(''); 
  const [repoName, setRepoName] = useState('');
  const [peopleNeeded, setPeopleNeeded] = useState('');
  const isBounty = category === 'MICRO_BOUNTY';
  const isRepoRequest = category === 'REPO_REQUEST';
  

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
          ...(isBounty && bountyRewardPoints ? { bounty_reward_points: Number(bountyRewardPoints) } : {}),
          ...(isBounty && bountyDeadline ? { bounty_deadline: bountyDeadline } : {}),
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
      setBountyRewardPoints('');
      setBountyDeadline('');
      setRepoName('');
      setPeopleNeeded('');
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
              <option value="COLLAB_SLOT">Collaboration Slot</option>
              <option value="MICRO_BOUNTY">Micro-Bounty</option>
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
        {isBounty && (
          <div className="create-post-selects">
            <div className="input-group">
              <label>Reward Points</label>
              <input
                type="number"
                min="0"
                className="select-input"
                placeholder="e.g. 100"
                value={bountyRewardPoints}
                onChange={(e) => setBountyRewardPoints(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Deadline</label>
              <input
                type="date"
                className="select-input"
                value={bountyDeadline}
                onChange={(e) => setBountyDeadline(e.target.value)}
              />
            </div>
          </div>
        )}
        {isRepoRequest && (
          <div className="create-post-selects">
            <div className="input-group">
              <label>Repository Name</label>
              <input
                type="text"
                className="select-input"
                placeholder="e.g. octocat/hello-world"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
              />
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
          placeholder={isBounty ? "Describe the bounty challenge..." : isRepoRequest ? "Briefly describe what you need help with..." : "What is the challenge?"}
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
