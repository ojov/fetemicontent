import React, { useState } from 'react';

function Login({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === 'admin' && pass === 'password123') {
      onLogin(user);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="card fade-in">
      <h2 className="text-center" style={{ background: 'linear-gradient(135deg, #fff 0%, #A7F3D0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2rem' }}>
        Fetemi Studios
      </h2>
      <p className="text-center mb-4" style={{ color: 'var(--text-muted)' }}>Sign in to your content suite</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input 
            type="text" 
            className="form-control" 
            value={user} 
            onChange={(e) => setUser(e.target.value)} 
            placeholder="Enter username"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <input 
            type="password" 
            className="form-control" 
            value={pass} 
            onChange={(e) => setPass(e.target.value)} 
            placeholder="Enter password"
            required
          />
        </div>

        {error && <div className="error-text text-center mb-4">{error}</div>}

        <button type="submit" className="btn btn-primary w-full">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
