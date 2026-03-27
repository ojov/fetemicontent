import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  const handleLogin = (user) => {
    setUsername(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
  };

  return (
    <>
      {isLoggedIn ? (
        <Dashboard username={username} onLogout={handleLogout} />
      ) : (
        <div className="app-container">
          <Login onLogin={handleLogin} />
        </div>
      )}
    </>
  );
}

export default App;
