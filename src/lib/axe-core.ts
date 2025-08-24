/**
 * Axe-core accessibility testing utilities
 * This module handles loading and running axe-core for accessibility scanning
 */

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  nodes: Array<{
    target: string[];
    html: string;
  }>;
}

export interface AxePass {
  id: string;
  description: string;
  nodes: Array<{
    target: string[];
    html: string;
  }>;
}

export interface AxeResults {
  violations: AxeViolation[];
  passes: AxePass[];
}

/**
 * Gets the axe-core script content, either from CDN or fallback implementation
 */
export async function getAxeCoreScript(): Promise<string> {
  try {
    // First, get the latest version URL from CDNJS API
    const apiResponse = await fetch('https://api.cdnjs.com/libraries/axe-core');
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      const latestUrl = apiData.latest;
      
      // Now fetch the actual axe-core script from the latest URL
      const scriptResponse = await fetch(latestUrl);
      if (scriptResponse.ok) {
        console.log(`Got axe-core from CDN: ${latestUrl}`);
        return await scriptResponse.text();
      }
    }
  } catch (error) {
    console.warn('Failed to fetch axe-core from CDN, using fallback:', error);
  }

  // Return fallback implementation
  return getFallbackAxeScript();
}

/**
 * Fallback axe-core implementation for basic accessibility checks
 */
function getFallbackAxeScript(): string {
  return `
    // Minimal axe-core fallback for basic accessibility checks
    window.axe = {
      run: function(callback) {
        // Basic accessibility checks
        const violations = [];
        const passes = [];
        
        // Check for missing alt text
        const images = document.querySelectorAll('img:not([alt])');
        if (images.length > 0) {
          violations.push({
            id: 'image-alt',
            impact: 'critical',
            description: 'Images must have alternate text',
            nodes: Array.from(images).map(img => ({
              target: [img.tagName.toLowerCase() + (img.id ? '#' + img.id : '')],
              html: img.outerHTML.substring(0, 100)
            }))
          });
        }
        
        // Check for missing form labels
        const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        const unlabeledInputs = Array.from(inputs).filter(input => {
          const labels = document.querySelectorAll('label[for="' + input.id + '"]');
          return input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button' && labels.length === 0;
        });
        
        if (unlabeledInputs.length > 0) {
          violations.push({
            id: 'label',
            impact: 'critical',
            description: 'Form elements must have labels',
            nodes: unlabeledInputs.map(input => ({
              target: [input.tagName.toLowerCase() + (input.id ? '#' + input.id : '')],
              html: input.outerHTML.substring(0, 100)
            }))
          });
        }
        
        // Check for proper heading structure
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0) {
          passes.push({
            id: 'page-has-heading-one',
            description: 'Page has heading structure',
            nodes: Array.from(headings).slice(0, 5).map(h => ({
              target: [h.tagName.toLowerCase()],
              html: h.outerHTML.substring(0, 100)
            }))
          });
        }
        
        callback(null, { violations, passes });
      }
    };
  `;
}

/**
 * Runs axe-core accessibility checks on a Playwright page
 */
export async function runAxeOnPage(page: any): Promise<AxeResults> {
  // Get and inject the axe-core script
  const axeCoreScript = await getAxeCoreScript();
  await page.addScriptTag({ content: axeCoreScript });
  
  // Run accessibility checks
  const results = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      // @ts-ignore - axe is injected globally
      if (typeof axe === 'undefined') {
        reject(new Error('axe-core not loaded'));
        return;
      }
      
      // @ts-ignore - axe is injected globally
      axe.run((err: any, results: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  });
  
  return {
    violations: (results as any).violations || [],
    passes: (results as any).passes || []
  };
}

/**
 * Calculates accessibility score based on violations and passes
 */
export function calculateAccessibilityScore(violations: AxeViolation[], passes: AxePass[]): number {
  if (!violations || !passes) return 0;
  
  // Simple scoring algorithm
  const totalChecks = violations.length + passes.length;
  if (totalChecks === 0) return 100;
  
  // Weight violations by impact
  const weightedViolations = violations.reduce((sum, violation) => {
    const weight = violation.impact === 'critical' ? 4 : 
                   violation.impact === 'serious' ? 3 :
                   violation.impact === 'moderate' ? 2 : 1;
    return sum + (violation.nodes?.length || 1) * weight;
  }, 0);
  
  const maxPossibleScore = totalChecks * 4; // Assuming all could be critical
  const score = Math.max(0, Math.round(100 - (weightedViolations / maxPossibleScore) * 100));
  
  return Math.min(100, score);
}
