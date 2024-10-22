import React, { useState, useEffect } from "react";

function EmailLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const emailLogs = await window.electronAPI.fetchLogs();
    setLogs(emailLogs);
  };

  return (
    <div>
      <h1>Email Logs</h1>
      <ul>
        {logs.map((log) => (
          <li key={log.id}>
            {log.timestamp}: {log.status} - {log.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EmailLogs;
