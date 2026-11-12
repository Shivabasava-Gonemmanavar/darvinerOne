import session from 'express-session';

export class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.ready = this.pool.execute(`CREATE TABLE IF NOT EXISTS web_sessions (
      session_id VARCHAR(128) NOT NULL PRIMARY KEY,
      expires_at BIGINT UNSIGNED NOT NULL,
      session_data MEDIUMTEXT NOT NULL,
      INDEX idx_web_sessions_expiry (expires_at)
    ) ENGINE=InnoDB`).then(() => undefined);
    this.cleanupTimer = setInterval(() => {
      this.ready.then(() => this.pool.execute('DELETE FROM web_sessions WHERE expires_at<=?', [Date.now()]))
        .catch((error) => console.error('Could not clean expired sessions:', error.message));
    }, 30 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  get(id, callback) {
    this.ready.then(() => this.pool.execute('SELECT session_data, expires_at FROM web_sessions WHERE session_id=?', [id]))
      .then(([rows]) => {
        const row = rows[0];
        if (!row || Number(row.expires_at) <= Date.now()) {
          if (row) this.destroy(id, () => {});
          return callback(null, null);
        }
        callback(null, JSON.parse(row.session_data));
      }).catch(callback);
  }

  set(id, sessionData, callback = () => {}) {
    const expires = sessionData.cookie?.expires ? new Date(sessionData.cookie.expires).getTime() : Date.now() + 8 * 60 * 60 * 1000;
    this.ready.then(() => this.pool.execute('INSERT INTO web_sessions(session_id,expires_at,session_data) VALUES(?,?,?) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at),session_data=VALUES(session_data)', [id, expires, JSON.stringify(sessionData)]))
      .then(() => callback(null)).catch(callback);
  }

  touch(id, sessionData, callback = () => {}) { this.set(id, sessionData, callback); }

  destroy(id, callback = () => {}) {
    this.ready.then(() => this.pool.execute('DELETE FROM web_sessions WHERE session_id=?', [id])).then(() => callback(null)).catch(callback);
  }

  close() { clearInterval(this.cleanupTimer); }
}
