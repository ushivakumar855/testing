import React, { useState } from 'react';

const FileUploadComponent = ({ email, scriptUrl }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('files', file); // Important: use 'files' as parameter name
    formData.append('email', email);
    formData.append('action', 'upload');

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        setMessage(`✅ ${result.message}`);
        setFile(null);
      } else {
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setMessage(`❌ Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={handleFileChange}
        accept=".txt,.pdf"
      />
      <button 
        onClick={handleUpload} 
        disabled={loading}
      >
        {loading ? 'Uploading...' : 'Upload Resume'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default FileUploadComponent;