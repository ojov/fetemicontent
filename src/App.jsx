import React from 'react';
import useStickyState from './utils/useStickyState';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useStickyState(false, 'fetemi_isLoggedIn');
  const [username, setUsername] = useStickyState('', 'fetemi_username');

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
