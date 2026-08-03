import { useState } from 'react';

const CreatePost = ({ onPostCreated }) => {
  const [text, setText] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('NORMAL');
  const [language, setLanguage] = useState('General'); // <-- NEW STATE
  const [showCodeInput, setShowCodeInput] = useState(false);

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
          language: language // <-- SENDING TO BACKEND
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
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <div className="create-post-card glass-panel">
      <form onSubmit={handleSubmit}>
        
        {/* NEW: Side-by-side dropdowns */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <select 
              className="category-select" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              <option value="NORMAL">Standard Post</option>
              <option value="PEER_REVIEW">Peer Review Request</option>
              <option value="COLLAB_SLOT">Collaboration Slot</option>
              <option value="MICRO_BOUNTY">Micro-Bounty</option>
            </select>

            <select 
              className="category-select" 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={{ marginBottom: 0 }}
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

        <textarea
          className="post-textarea"
          placeholder="What are you working on?"
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
            className="toggle-code-btn"
            onClick={() => setShowCodeInput(!showCodeInput)}
          >
            {showCodeInput ? '- Remove Code' : '+ Add Code Snippet'}
          </button>
          
          <button type="submit" className="submit-post-btn" disabled={!text}>
            Post
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;