/**
 * AWS Lambda handler for axe-core scanning
 * Receives URL via API Gateway, returns scan results
 */

const { scanUrl } = require('./scanner');

exports.handler = async (event) => {
  console.log('Lambda invoked with event:', JSON.stringify(event));

  // Handle OPTIONS request for CORS preflight
  // Note: Lambda Function URL CORS configuration handles CORS headers automatically
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: '',
    };
  }

  try {
    // Parse request body
    let body;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event;
    }

    const { url, scanId, callbackUrl } = body;

    // Validate URL
    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'URL is required',
        }),
      };
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid URL format',
        }),
      };
    }

    // Run scan
    const results = await scanUrl(url);

    // If callback URL provided, send results back
    if (callbackUrl && scanId) {
      try {
        await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scanId,
            violations: results.violations,
            passes: results.passes,
          }),
        });
        console.log('Results sent to callback URL');
      } catch (callbackError) {
        console.error('Failed to send results to callback:', callbackError);
      }
    }

    // Return results
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(results),
    };

  } catch (error) {
    console.error('Lambda error:', error);

    // If callback URL provided, notify about failure
    if (callbackUrl && scanId) {
      try {
        await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scanId,
            status: 'failed',
            error: error.message || 'Scan failed',
          }),
        });
        console.log('Failure sent to callback URL');
      } catch (callbackError) {
        console.error('Failed to send failure to callback:', callbackError);
      }
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
    };
  }
};
