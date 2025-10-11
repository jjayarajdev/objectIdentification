"""
API endpoints for transaction history and statistics
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.database import db

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("/history")
async def get_transaction_history(
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    status: Optional[str] = Query(None, description="Filter by status (success/error/processing)")
):
    """
    Get transaction history with optional filters
    """
    try:
        # Build query filters
        filters = {}
        if transaction_type:
            filters['transaction_type'] = transaction_type
        if status:
            filters['status'] = status

        # Get transactions from database
        transactions = db.get_transaction_history(
            limit=limit,
            offset=offset,
            transaction_type=transaction_type
        )

        # Parse JSON fields for readability
        for transaction in transactions:
            if transaction.get('request_data'):
                try:
                    import json
                    transaction['request_data'] = json.loads(transaction['request_data'])
                except:
                    pass
            if transaction.get('response_data'):
                try:
                    import json
                    transaction['response_data'] = json.loads(transaction['response_data'])
                except:
                    pass

        return {
            "success": True,
            "data": transactions,
            "count": len(transactions),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_transaction_statistics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    period: Optional[str] = Query("day", description="Statistics period (hour/day/week/month)")
):
    """
    Get transaction statistics for a given period
    """
    try:
        # Default to last 7 days if no dates provided
        if not start_date:
            start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        stats = db.get_statistics(start_date=start_date, end_date=end_date)

        return {
            "success": True,
            "data": stats,
            "period": {
                "start": start_date,
                "end": end_date
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/uploads")
async def get_upload_history(
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    project_id: Optional[str] = Query(None, description="Filter by project ID")
):
    """
    Get image upload history
    """
    try:
        with db.get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    iu.*,
                    t.timestamp,
                    t.status as transaction_status
                FROM image_uploads iu
                JOIN transactions t ON iu.transaction_id = t.transaction_id
            """
            params = []

            if project_id:
                query += " WHERE iu.project_id = ?"
                params.append(project_id)

            query += " ORDER BY iu.created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            uploads = [dict(row) for row in cursor.fetchall()]

            # Parse metadata JSON
            for upload in uploads:
                if upload.get('metadata'):
                    try:
                        import json
                        upload['metadata'] = json.loads(upload['metadata'])
                    except:
                        pass

            return {
                "success": True,
                "data": uploads,
                "count": len(uploads),
                "limit": limit,
                "offset": offset
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis")
async def get_analysis_history(
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    scene_type: Optional[str] = Query(None, description="Filter by scene type")
):
    """
    Get analysis results history
    """
    try:
        with db.get_db() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    ar.*,
                    t.timestamp,
                    t.status as transaction_status
                FROM analysis_results ar
                JOIN transactions t ON ar.transaction_id = t.transaction_id
            """
            params = []

            if scene_type:
                query += " WHERE ar.scene_type = ?"
                params.append(scene_type)

            query += " ORDER BY ar.created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            results = [dict(row) for row in cursor.fetchall()]

            # Parse JSON fields
            for result in results:
                for field in ['detected_items', 'key_observations', 'estimated_value']:
                    if result.get(field):
                        try:
                            import json
                            result[field] = json.loads(result[field])
                        except:
                            pass

            return {
                "success": True,
                "data": results,
                "count": len(results),
                "limit": limit,
                "offset": offset
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api-calls")
async def get_api_call_history(
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    provider: Optional[str] = Query(None, description="Filter by API provider (OpenAI, Google Maps)")
):
    """
    Get external API call history
    """
    try:
        with db.get_db() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM api_calls"
            params = []

            if provider:
                query += " WHERE api_provider = ?"
                params.append(provider)

            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            api_calls = [dict(row) for row in cursor.fetchall()]

            # Parse JSON fields
            for call in api_calls:
                for field in ['request_data', 'response_data']:
                    if call.get(field):
                        try:
                            import json
                            call[field] = json.loads(call[field])
                        except:
                            pass

            # Calculate totals
            cursor.execute("""
                SELECT
                    SUM(cost_usd) as total_cost,
                    SUM(tokens_used) as total_tokens,
                    COUNT(*) as total_calls
                FROM api_calls
                WHERE api_provider = ?
            """, (provider,) if provider else ("OpenAI",))

            totals = dict(cursor.fetchone())

            return {
                "success": True,
                "data": api_calls,
                "totals": totals,
                "count": len(api_calls),
                "limit": limit,
                "offset": offset
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance")
async def get_performance_metrics(
    metric_type: Optional[str] = Query(None, description="Filter by metric type"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get performance metrics
    """
    try:
        with db.get_db() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM performance_metrics"
            params = []
            conditions = []

            if metric_type:
                conditions.append("metric_type = ?")
                params.append(metric_type)

            if start_date and end_date:
                conditions.append("created_at BETWEEN ? AND ?")
                params.extend([start_date, end_date])

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY created_at DESC"

            cursor.execute(query, params)
            metrics = [dict(row) for row in cursor.fetchall()]

            # Parse metadata JSON
            for metric in metrics:
                if metric.get('metadata'):
                    try:
                        import json
                        metric['metadata'] = json.loads(metric['metadata'])
                    except:
                        pass

            # Calculate aggregates
            aggregates = {}
            if metrics:
                cursor.execute("""
                    SELECT
                        metric_name,
                        AVG(metric_value) as avg_value,
                        MIN(metric_value) as min_value,
                        MAX(metric_value) as max_value,
                        COUNT(*) as count
                    FROM performance_metrics
                    GROUP BY metric_name
                """)
                for row in cursor.fetchall():
                    aggregates[row['metric_name']] = dict(row)

            return {
                "success": True,
                "data": metrics,
                "aggregates": aggregates,
                "count": len(metrics)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cleanup")
async def cleanup_old_transactions(
    days: int = Query(30, ge=1, le=365, description="Delete transactions older than X days")
):
    """
    Clean up old transaction records
    """
    try:
        deleted_count = db.cleanup_old_transactions(days=days)

        return {
            "success": True,
            "message": f"Deleted {deleted_count} transactions older than {days} days",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
async def get_transaction_summary():
    """
    Get a summary of all transactions
    """
    try:
        with db.get_db() as conn:
            cursor = conn.cursor()

            # Get today's stats
            today = datetime.now().strftime("%Y-%m-%d")
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM transactions
                WHERE date(timestamp) = date(?)
            """, (today,))
            today_count = cursor.fetchone()['count']

            # Get this week's stats
            week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM transactions
                WHERE timestamp >= ?
            """, (week_ago,))
            week_count = cursor.fetchone()['count']

            # Get total uploads
            cursor.execute("SELECT COUNT(*) as count FROM image_uploads")
            total_uploads = cursor.fetchone()['count']

            # Get total analyses
            cursor.execute("SELECT COUNT(*) as count FROM analysis_results")
            total_analyses = cursor.fetchone()['count']

            # Get API costs
            cursor.execute("""
                SELECT
                    api_provider,
                    SUM(cost_usd) as total_cost,
                    SUM(tokens_used) as total_tokens,
                    COUNT(*) as call_count
                FROM api_calls
                GROUP BY api_provider
            """)
            api_costs = {row['api_provider']: dict(row) for row in cursor.fetchall()}

            # Get error rate
            cursor.execute("""
                SELECT
                    COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
                    COUNT(*) as total
                FROM transactions
            """)
            error_stats = cursor.fetchone()
            error_rate = (error_stats['errors'] / error_stats['total'] * 100) if error_stats['total'] > 0 else 0

            return {
                "success": True,
                "summary": {
                    "today_transactions": today_count,
                    "week_transactions": week_count,
                    "total_uploads": total_uploads,
                    "total_analyses": total_analyses,
                    "error_rate_percent": round(error_rate, 2),
                    "api_costs": api_costs
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))