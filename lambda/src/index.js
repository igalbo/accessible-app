/**
 * AWS Lambda handler for axe-core scanning
 * Receives URL via API Gateway, returns scan results
 */

const { scanUrl } = require('./scanner');

exports.handler = async (event) => {
  console.log('Lambda invoked with event:', JSON.stringify(event));

  try {
    // Parse request body
    let body;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event;
    }

    const { url } = body;

    // Validate URL
    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid URL format',
        }),
      };
    }

    // Run scan
    const results = await scanUrl(url);

    // Return results
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(results),
    };

  } catch (error) {
    console.error('Lambda error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
    };
  }
};
