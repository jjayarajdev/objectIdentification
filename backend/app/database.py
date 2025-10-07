"""
SQLite Database Configuration and Models for Transaction Logging
"""
import os
import sqlite3
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import json
import threading

# Thread-local storage for database connections
_thread_local = threading.local()

class TransactionDB:
    """SQLite database handler for transaction logging"""

    def __init__(self, db_path: str = "./surveyor_transactions.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        """Get a thread-local database connection"""
        if not hasattr(_thread_local, 'connection'):
            _thread_local.connection = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                timeout=30.0
            )
            _thread_local.connection.row_factory = sqlite3.Row
            # Enable WAL mode for better concurrency
            _thread_local.connection.execute("PRAGMA journal_mode=WAL")
            _thread_local.connection.execute("PRAGMA synchronous=NORMAL")
        return _thread_local.connection

    @contextmanager
    def get_db(self):
        """Context manager for database connections"""
        conn = self._get_connection()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e

    def _init_db(self):
        """Initialize database tables"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            # Main transactions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT UNIQUE NOT NULL,
                    transaction_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    method TEXT,
                    endpoint TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    request_data TEXT,
                    response_data TEXT,
                    error_message TEXT,
                    duration_ms INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Image uploads table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS image_uploads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    file_size INTEGER,
                    file_type TEXT,
                    project_id TEXT,
                    upload_path TEXT,
                    metadata TEXT,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
                )
            ''')

            # Analysis results table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analysis_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT NOT NULL,
                    image_id TEXT,
                    filename TEXT,
                    scene_type TEXT,
                    scene_overview TEXT,
                    detected_items TEXT,
                    key_observations TEXT,
                    narrative_report TEXT,
                    estimated_value TEXT,
                    gps_latitude REAL,
                    gps_longitude REAL,
                    gps_address TEXT,
                    tokens_used INTEGER,
                    cost_usd REAL,
                    processing_time_ms INTEGER,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
                )
            ''')

            # API calls table (for external API tracking)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS api_calls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT NOT NULL,
                    api_provider TEXT NOT NULL,
                    api_endpoint TEXT,
                    request_method TEXT,
                    request_data TEXT,
                    response_status INTEGER,
                    response_data TEXT,
                    tokens_used INTEGER,
                    cost_usd REAL,
                    latency_ms INTEGER,
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
                )
            ''')

            # Performance metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL,
                    unit TEXT,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
                )
            ''')

            # User sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_time DATETIME,
                    total_requests INTEGER DEFAULT 0,
                    total_uploads INTEGER DEFAULT 0,
                    total_analyses INTEGER DEFAULT 0,
                    metadata TEXT
                )
            ''')

            # Create indexes for better query performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_image_uploads_transaction ON image_uploads(transaction_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_analysis_results_transaction ON analysis_results(transaction_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_calls_transaction ON api_calls(transaction_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_calls_provider ON api_calls(api_provider)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id)')

    def log_transaction(self, transaction_data: Dict[str, Any]) -> str:
        """Log a main transaction"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            # Generate transaction ID if not provided
            if 'transaction_id' not in transaction_data:
                transaction_data['transaction_id'] = self._generate_transaction_id()

            cursor.execute('''
                INSERT INTO transactions (
                    transaction_id, transaction_type, status, method, endpoint,
                    ip_address, user_agent, request_data, response_data,
                    error_message, duration_ms, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                transaction_data['transaction_id'],
                transaction_data.get('transaction_type', 'unknown'),
                transaction_data.get('status', 'pending'),
                transaction_data.get('method'),
                transaction_data.get('endpoint'),
                transaction_data.get('ip_address'),
                transaction_data.get('user_agent'),
                json.dumps(transaction_data.get('request_data')) if transaction_data.get('request_data') else None,
                json.dumps(transaction_data.get('response_data')) if transaction_data.get('response_data') else None,
                transaction_data.get('error_message'),
                transaction_data.get('duration_ms'),
                transaction_data.get('timestamp', datetime.now().isoformat())
            ))

            return transaction_data['transaction_id']

    def log_image_upload(self, upload_data: Dict[str, Any]) -> int:
        """Log an image upload"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO image_uploads (
                    transaction_id, filename, file_size, file_type, project_id,
                    upload_path, metadata, status, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                upload_data['transaction_id'],
                upload_data['filename'],
                upload_data.get('file_size'),
                upload_data.get('file_type'),
                upload_data.get('project_id'),
                upload_data.get('upload_path'),
                json.dumps(upload_data.get('metadata')) if upload_data.get('metadata') else None,
                upload_data.get('status', 'success'),
                upload_data.get('error_message')
            ))

            return cursor.lastrowid

    def log_analysis_result(self, analysis_data: Dict[str, Any]) -> int:
        """Log an analysis result"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO analysis_results (
                    transaction_id, image_id, filename, scene_type, scene_overview,
                    detected_items, key_observations, narrative_report, estimated_value,
                    gps_latitude, gps_longitude, gps_address, tokens_used, cost_usd,
                    processing_time_ms, status, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                analysis_data['transaction_id'],
                analysis_data.get('image_id'),
                analysis_data.get('filename'),
                analysis_data.get('scene_type'),
                analysis_data.get('scene_overview'),
                json.dumps(analysis_data.get('detected_items')) if analysis_data.get('detected_items') else None,
                json.dumps(analysis_data.get('key_observations')) if analysis_data.get('key_observations') else None,
                analysis_data.get('narrative_report'),
                json.dumps(analysis_data.get('estimated_value')) if analysis_data.get('estimated_value') else None,
                analysis_data.get('gps_latitude'),
                analysis_data.get('gps_longitude'),
                analysis_data.get('gps_address'),
                analysis_data.get('tokens_used'),
                analysis_data.get('cost_usd'),
                analysis_data.get('processing_time_ms'),
                analysis_data.get('status', 'success'),
                analysis_data.get('error_message')
            ))

            return cursor.lastrowid

    def log_api_call(self, api_data: Dict[str, Any]) -> int:
        """Log an external API call"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO api_calls (
                    transaction_id, api_provider, api_endpoint, request_method,
                    request_data, response_status, response_data, tokens_used,
                    cost_usd, latency_ms, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                api_data['transaction_id'],
                api_data['api_provider'],
                api_data.get('api_endpoint'),
                api_data.get('request_method'),
                json.dumps(api_data.get('request_data')) if api_data.get('request_data') else None,
                api_data.get('response_status'),
                json.dumps(api_data.get('response_data')) if api_data.get('response_data') else None,
                api_data.get('tokens_used'),
                api_data.get('cost_usd'),
                api_data.get('latency_ms'),
                api_data.get('error_message')
            ))

            return cursor.lastrowid

    def log_performance_metric(self, metric_data: Dict[str, Any]) -> int:
        """Log a performance metric"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO performance_metrics (
                    transaction_id, metric_type, metric_name, metric_value, unit, metadata
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                metric_data['transaction_id'],
                metric_data['metric_type'],
                metric_data['metric_name'],
                metric_data['metric_value'],
                metric_data.get('unit'),
                json.dumps(metric_data.get('metadata')) if metric_data.get('metadata') else None
            ))

            return cursor.lastrowid

    def update_transaction_status(self, transaction_id: str, status: str,
                                 response_data: Optional[Dict] = None,
                                 error_message: Optional[str] = None,
                                 duration_ms: Optional[int] = None):
        """Update transaction status"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            update_parts = ['status = ?']
            params = [status]

            if response_data is not None:
                update_parts.append('response_data = ?')
                params.append(json.dumps(response_data))

            if error_message is not None:
                update_parts.append('error_message = ?')
                params.append(error_message)

            if duration_ms is not None:
                update_parts.append('duration_ms = ?')
                params.append(duration_ms)

            params.append(transaction_id)

            query = f"UPDATE transactions SET {', '.join(update_parts)} WHERE transaction_id = ?"
            cursor.execute(query, params)

    def get_transaction_history(self, limit: int = 100, offset: int = 0,
                               transaction_type: Optional[str] = None) -> List[Dict]:
        """Get transaction history"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM transactions"
            params = []

            if transaction_type:
                query += " WHERE transaction_type = ?"
                params.append(transaction_type)

            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_statistics(self, start_date: Optional[str] = None,
                       end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get transaction statistics"""
        with self.get_db() as conn:
            cursor = conn.cursor()

            date_filter = ""
            params = []

            if start_date and end_date:
                date_filter = " WHERE timestamp BETWEEN ? AND ?"
                params = [start_date, end_date]

            # Total transactions
            cursor.execute(f"SELECT COUNT(*) as total FROM transactions{date_filter}", params)
            total = cursor.fetchone()['total']

            # Transactions by type
            cursor.execute(f'''
                SELECT transaction_type, COUNT(*) as count
                FROM transactions{date_filter}
                GROUP BY transaction_type
            ''', params)
            by_type = {row['transaction_type']: row['count'] for row in cursor.fetchall()}

            # Success rate
            cursor.execute(f'''
                SELECT
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
                FROM transactions{date_filter}
            ''', params)
            status_counts = cursor.fetchone()

            # Average processing time
            cursor.execute(f'''
                SELECT AVG(duration_ms) as avg_duration
                FROM transactions{date_filter}
                WHERE duration_ms IS NOT NULL
            ''', params)
            avg_duration = cursor.fetchone()['avg_duration']

            # API costs
            cursor.execute(f'''
                SELECT
                    SUM(cost_usd) as total_cost,
                    SUM(tokens_used) as total_tokens
                FROM api_calls
            ''')
            api_stats = cursor.fetchone()

            return {
                'total_transactions': total,
                'transactions_by_type': by_type,
                'success_count': status_counts['success'] or 0,
                'error_count': status_counts['error'] or 0,
                'success_rate': (status_counts['success'] or 0) / total * 100 if total > 0 else 0,
                'average_duration_ms': avg_duration,
                'total_api_cost_usd': api_stats['total_cost'] or 0,
                'total_tokens_used': api_stats['total_tokens'] or 0
            }

    def _generate_transaction_id(self) -> str:
        """Generate a unique transaction ID"""
        import uuid
        return f"txn_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    def cleanup_old_transactions(self, days: int = 30):
        """Clean up old transaction records"""
        with self.get_db() as conn:
            cursor = conn.cursor()
            cutoff_date = datetime.now().timestamp() - (days * 24 * 60 * 60)

            # Delete old transactions and related data (cascade)
            cursor.execute('''
                DELETE FROM transactions
                WHERE datetime(timestamp) < datetime(?, 'unixepoch')
            ''', (cutoff_date,))

            return cursor.rowcount

# Create a singleton instance
db = TransactionDB()