"""
Middleware for transaction logging
"""
import time
import json
from typing import Callable
from fastapi import Request, Response
from fastapi.routing import APIRoute
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
import uuid

from app.database import db

class TransactionLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API transactions"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip logging for certain endpoints to prevent recursion and reduce noise
        skip_paths = ['/api/transactions', '/docs', '/openapi.json', '/uploads', '/reports', '/favicon.ico']
        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)

        # Generate a unique transaction ID for this request
        transaction_id = f"txn_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        request.state.transaction_id = transaction_id

        # Start time for duration calculation
        start_time = time.time()

        # Get client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")

        # Get request metadata without consuming the body
        request_data = {
            "method": request.method,
            "headers_count": len(request.headers),
            "content_type": request.headers.get("content-type", "")
        }

        # Log the incoming transaction
        try:
            db.log_transaction({
                'transaction_id': transaction_id,
                'transaction_type': 'api_request',
                'status': 'processing',
                'method': request.method,
                'endpoint': str(request.url.path),
                'ip_address': client_ip,
                'user_agent': user_agent,
                'request_data': request_data
            })
        except Exception as e:
            print(f"Error logging transaction start: {e}")

        # Process the request
        response = None
        error_message = None
        status = 'success'
        response_body = None

        try:
            response = await call_next(request)

            # Capture response body for JSON responses
            if response and hasattr(response, 'body_iterator'):
                # Collect the response body
                body_parts = []
                async for part in response.body_iterator:
                    body_parts.append(part)

                # Reconstruct the body
                body_bytes = b"".join(body_parts)

                # Try to parse as JSON if it's a JSON response
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        response_body = json.loads(body_bytes.decode('utf-8'))
                    except:
                        response_body = None

                # Create a new response with the same body
                from fastapi import Response as FastAPIResponse
                response = FastAPIResponse(
                    content=body_bytes,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )
        except Exception as e:
            error_message = str(e)
            status = 'error'
            raise
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)

            # Log response data
            response_data = {
                'status_code': response.status_code if response else 500
            }

            # Include JSON body if available
            if response_body:
                response_data.update(response_body)

            # Update transaction with final status
            try:
                db.update_transaction_status(
                    transaction_id=transaction_id,
                    status=status,
                    response_data=response_data,
                    error_message=error_message,
                    duration_ms=duration_ms
                )
            except Exception as e:
                print(f"Error updating transaction status: {e}")

        return response


class LoggingRoute(APIRoute):
    """Custom route class that provides transaction ID to route handlers"""

    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            # Ensure transaction ID is available
            if not hasattr(request.state, 'transaction_id'):
                request.state.transaction_id = f"txn_{int(time.time())}_{uuid.uuid4().hex[:8]}"

            response = await original_route_handler(request)
            return response

        return custom_route_handler


def log_image_upload(transaction_id: str, filename: str, file_size: int,
                     file_type: str, upload_path: str, project_id: str = None,
                     metadata: dict = None, status: str = 'success',
                     error_message: str = None):
    """Helper function to log image uploads"""
    try:
        db.log_image_upload({
            'transaction_id': transaction_id,
            'filename': filename,
            'file_size': file_size,
            'file_type': file_type,
            'project_id': project_id,
            'upload_path': upload_path,
            'metadata': metadata,
            'status': status,
            'error_message': error_message
        })
    except Exception as e:
        print(f"Error logging image upload: {e}")


def log_analysis_result(transaction_id: str, filename: str,
                        analysis_data: dict, processing_time_ms: int,
                        tokens_used: int = None, cost_usd: float = None,
                        status: str = 'success', error_message: str = None):
    """Helper function to log analysis results"""
    try:
        db.log_analysis_result({
            'transaction_id': transaction_id,
            'filename': filename,
            'scene_type': analysis_data.get('scene_type'),
            'scene_overview': analysis_data.get('scene_overview'),
            'detected_items': analysis_data.get('simplified_data'),
            'key_observations': analysis_data.get('key_observations'),
            'narrative_report': analysis_data.get('narrative_report'),
            'estimated_value': analysis_data.get('estimated_property_value'),
            'gps_latitude': analysis_data.get('gps', {}).get('latitude'),
            'gps_longitude': analysis_data.get('gps', {}).get('longitude'),
            'gps_address': analysis_data.get('gps', {}).get('address'),
            'tokens_used': tokens_used,
            'cost_usd': cost_usd,
            'processing_time_ms': processing_time_ms,
            'status': status,
            'error_message': error_message
        })
    except Exception as e:
        print(f"Error logging analysis result: {e}")


def log_openai_api_call(transaction_id: str, endpoint: str,
                        model: str, tokens_used: int,
                        cost_usd: float, latency_ms: int,
                        status: str = 'success', error_message: str = None):
    """Helper function to log OpenAI API calls"""
    try:
        db.log_api_call({
            'transaction_id': transaction_id,
            'api_provider': 'OpenAI',
            'api_endpoint': endpoint,
            'request_method': 'POST',
            'request_data': {'model': model},
            'response_status': 200 if status == 'success' else 500,
            'tokens_used': tokens_used,
            'cost_usd': cost_usd,
            'latency_ms': latency_ms,
            'error_message': error_message
        })
    except Exception as e:
        print(f"Error logging OpenAI API call: {e}")


def log_google_maps_api_call(transaction_id: str, service: str,
                             latency_ms: int, status: str = 'success',
                             error_message: str = None):
    """Helper function to log Google Maps API calls"""
    try:
        db.log_api_call({
            'transaction_id': transaction_id,
            'api_provider': 'Google Maps',
            'api_endpoint': service,
            'request_method': 'GET',
            'response_status': 200 if status == 'success' else 500,
            'latency_ms': latency_ms,
            'error_message': error_message
        })
    except Exception as e:
        print(f"Error logging Google Maps API call: {e}")


def log_performance_metric(transaction_id: str, metric_type: str,
                          metric_name: str, metric_value: float,
                          unit: str = None, metadata: dict = None):
    """Helper function to log performance metrics"""
    try:
        db.log_performance_metric({
            'transaction_id': transaction_id,
            'metric_type': metric_type,
            'metric_name': metric_name,
            'metric_value': metric_value,
            'unit': unit,
            'metadata': metadata
        })
    except Exception as e:
        print(f"Error logging performance metric: {e}")