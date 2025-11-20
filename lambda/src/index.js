/**
 * AWS Lambda handler for axe-core scanning
 * Receives URL via API Gateway, writes results directly to database
 */

const { scanUrl } = require('./scanner');
const { updateScanResults, updateScanError } = require('./utils');

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

    const { url, scanId } = body;

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

    // If scanId provided, write results directly to database
    if (scanId) {
      try {
        await updateScanResults(scanId, results.violations, results.passes);
        console.log('Results written to database');
      } catch (dbError) {
        console.error('Failed to write results to database:', dbError);
        // Don't fail the request, still return results
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

    // Try to write error to database if we have scanId from body
    try {
      let body;
      if (event.body) {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } else {
        body = event;
      }
      
      const { scanId } = body;
      if (scanId) {
        await updateScanError(scanId, error.message || 'Scan failed');
        console.log('Error written to database');
      }
    } catch (dbError) {
      console.error('Failed to write error to database:', dbError);
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
