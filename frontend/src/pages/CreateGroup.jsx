import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CreateGroup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("accessToken");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const response = await fetch("http://localhost:3001/api/groups/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, is_private: isPrivate }),
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/group/${data.id}`);
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to create group.");
      }
    } catch (error) {
      setErrorMessage("Could not connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-container">
        <h2>Create a Group</h2>
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. React Developers BD"
            />
          </div>

          <div className="input-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
            />
          </div>

          <div className="input-group input-group--checkbox">
            <input
              type="checkbox"
              id="privacyToggle"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <label htmlFor="privacyToggle">Make Group Private</label>
          </div>
          <p className="form-hint">
            Private groups require users to request access.
          </p>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
