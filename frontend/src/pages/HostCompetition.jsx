import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HostCompetition = () => {
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [language, setLanguage] = useState('JavaScript');
    const [questionContent, setQuestionContent] = useState('');
    const [startTime, setStartTime] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [evaluationMode, setEvaluationMode] = useState('MANUAL');
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const token = localStorage.getItem('accessToken');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSubmitting(true);

        try {
            const response = await fetch('http://localhost:3001/api/competition/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    language,
                    question_content: questionContent,
                    start_time: new Date(startTime).toISOString(),
                    duration_minutes: Number(durationMinutes),
                    evaluation_mode: evaluationMode
                })
            });

            if (response.ok) {
                const data = await response.json();
                navigate(`/competition/${data.id}`);
            } else {
                const errData = await response.json().catch(() => ({}));
                setErrorMessage(errData.error || 'Failed to create competition.');
            }
        } catch (error) {
            console.error('Error creating competition:', error);
            setErrorMessage('Could not connect to the server.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="form-container form-container--wide">
                <h2>Host a Coding Competition</h2>

                {errorMessage && <p className="error-text">{errorMessage}</p>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Description</label>
                        <textarea
                            className="post-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this competition about?"
                        />
                    </div>

                    <div className="form-row-2">
                        <div className="input-group">
                            <label>Language *</label>
                            <select
                                className="select-input"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option value="JavaScript">JavaScript</option>
                                <option value="Python">Python</option>
                                <option value="Java">Java</option>
                                <option value="C++">C++</option>
                                <option value="React">React</option>
                                <option value="SQL">SQL</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Evaluation Mode</label>
                            <select
                                className="select-input"
                                value={evaluationMode}
                                onChange={(e) => setEvaluationMode(e.target.value)}
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="AUTO">Automatic</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Question *</label>
                        <textarea
                            className="code-textarea"
                            value={questionContent}
                            onChange={(e) => setQuestionContent(e.target.value)}
                            placeholder="This stays hidden until the competition goes live..."
                            required
                        />
                    </div>

                    <div className="form-row-2">
                        <div className="input-group">
                            <label>Start Time *</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Duration (minutes) *</label>
                            <input
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Competition'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default HostCompetition;
