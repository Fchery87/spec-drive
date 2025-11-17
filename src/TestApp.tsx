import React from 'react'

export default function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>React is Working!</h1>
      <p>This is a simple test component to verify React is rendering correctly.</p>
      <div style={{ backgroundColor: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
        <h3>Environment Check:</h3>
        <ul>
          <li>Date: {new Date().toLocaleString()}</li>
          <li>User Agent: {navigator.userAgent}</li>
          <li>Location: {window.location.href}</li>
        </ul>
      </div>
      <button 
        onClick={() => alert('Button click works!')}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  )
}