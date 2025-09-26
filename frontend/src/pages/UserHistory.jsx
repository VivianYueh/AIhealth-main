// src/pages/UserHistory.jsx
import React, { useEffect, useState } from 'react'

export default function UserHistory() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    const stored = localStorage.getItem('chat_history')
    if (stored) {
      setHistory(JSON.parse(stored))
    }
  }, [])

  return (
    <div className="container my-5">
      <h2 className="mb-4">使用者歷史紀錄</h2>
      {history.length === 0 ? (
        <p className="text-muted">尚無歷史紀錄。</p>
      ) : (
        <ul className="list-group">
          {history.map((msg, index) => (
            <li key={index} className="list-group-item">
              <strong>{msg.role === 'user' ? '你' : '系統'}：</strong> {msg.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
