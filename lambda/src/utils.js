/**
 * Lambda utility functions
 * Database operations and score calculation
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Calculates accessibility score based on violations and passes
 * Note: This duplicates logic from src/lib/axe-core.ts but is necessary
 * for Lambda to calculate the score when writing to the database
 */
function calculateAccessibilityScore(violations, passes) {
  if (!violations || !passes) return 0;

  const totalChecks = violations.length + passes.length;
  if (totalChecks === 0) return 100;

  // Weight violations by impact
  const weightedViolations = violations.reduce((sum, violation) => {
    const weight =
      violation.impact === 'critical'
        ? 4
        : violation.impact === 'serious'
        ? 3
        : violation.impact === 'moderate'
        ? 2
        : 1;
    return sum + (violation.nodes?.length || 1) * weight;
  }, 0);

  const maxPossibleScore = totalChecks * 4;
  const score = Math.max(
    0,
    Math.round(100 - (weightedViolations / maxPossibleScore) * 100)
  );

  return Math.min(100, score);
}

/**
 * Update scan in database with results
 */
async function updateScanResults(scanId, violations, passes) {
  const supabase = getSupabaseClient();
  const score = calculateAccessibilityScore(violations, passes);

  const { data, error } = await supabase
    .from('scans')
    .update({
      status: 'completed',
      score: score,
      result_json: {
        violations,
        passes,
      },
      completed_at: new Date().toISOString(),
    })
    .eq('id', scanId)
    .select();

  if (error) {
    console.error('Database update error:', error);
    throw error;
  }

  console.log(`Updated scan ${scanId} with score ${score}`);
  return data;
}

/**
 * Update scan in database with error
 */
async function updateScanError(scanId, errorMessage) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('scans')
    .update({
      status: 'failed',
      error: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', scanId)
    .select();

  if (error) {
    console.error('Database error update failed:', error);
    throw error;
  }

  console.log(`Updated scan ${scanId} with error: ${errorMessage}`);
  return data;
}

module.exports = {
  updateScanResults,
  updateScanError,
};
