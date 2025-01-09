// content.js
console.log('Content script loaded!'); // Debug Point 1

let wordMappings;
let wordExceptions;

async function initializeExtension() {
  console.log('initializeExtension called'); // Debug Point 2
  try {
    console.log('Fetching storage data...'); // Debug Point 3
    const data = await browserAPI.storage.local.get(['wordMappings', 'wordExceptions']);
    console.log('Storage data received:', data); // Debug Point 4
    
    // Normalize all keys to lowercase
    const normalizedMappings = {};
    if (data.wordMappings) {
      Object.entries(data.wordMappings).forEach(([key, value]) => {
        normalizedMappings[key.toLowerCase()] = value;
      });
    }
    
    console.log('Normalized mappings:', normalizedMappings); // Debug Point 5
    wordMappings = normalizedMappings;
    wordExceptions = data.wordExceptions || [];
    
    // Wait for document to be ready
    if (document.readyState === 'loading') {
      console.log('Document still loading, adding DOMContentLoaded listener'); // Debug Point 6
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired'); // Debug Point 7
        replaceWords();
      });
    } else {
      console.log('Document already loaded, calling replaceWords directly'); // Debug Point 8
      replaceWords();
    }
  } catch (error) {
    console.error('Error in initializeExtension:', error); // Debug Point 9
  }
}

function replaceWords() {
  console.log('replaceWords called'); // Debug Point 10
  if (!wordMappings) {
    console.log('No word mappings available yet');
    return;
  }

  console.log('Current word mappings:', wordMappings); // Debug Point 11

  const textNodes = document.evaluate(
    '//text()[not(ancestor::script)][not(ancestor::style)]',
    document,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  console.log(`Found ${textNodes.snapshotLength} text nodes to process`); // Debug Point 12

  for (let i = 0; i < textNodes.snapshotLength; i++) {
    let node = textNodes.snapshotItem(i);
    let text = node.textContent;
    
    // Only process if text contains any of our target words
    const hasTargetWord = Object.keys(wordMappings).some(word => 
      text.toLowerCase().includes(word.toLowerCase())
    );
    
    if (!hasTargetWord) continue;

    // console.log('Processing text containing target word:', text);

    // Build a list of words/phrases to check and their positions
    let matches = [];
    
    // Find positions of exceptions
    for (const exception of wordExceptions) {
      let pos = -1;
      while ((pos = text.toLowerCase().indexOf(exception.toLowerCase(), pos + 1)) !== -1) {
        matches.push({
          start: pos,
          end: pos + exception.length,
          text: text.substring(pos, pos + exception.length),
          isException: true
        });
      }
    }
    
    // Find positions of words to replace
    for (const [original] of Object.entries(wordMappings)) {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const overlapsException = matches.some(m => 
          m.isException && 
          (
            // Check if the start of the replacement falls within the exception range
            (match.index >= m.start && match.index < m.end) || 
        
            // Check if the end of the replacement falls within the exception range
            (match.index + match[0].length > m.start && 
             match.index + match[0].length <= m.end)
          )
        );
        
        if (!overlapsException) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            isException: false
          });
        }
      }
    }
    
    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);
    
    // Build the result string
    let result = '';
    let lastIndex = 0;
    
    for (const match of matches) {
      // Add text before this match
      result += text.substring(lastIndex, match.start);
      
      // Add the match (either preserved exception or replacement)
      if (match.isException) {
        result += match.text;
      } else {
        // Use lowercase for lookup
        result += wordMappings[match.text.toLowerCase()] || match.text;
      }
      
      lastIndex = match.end;
    }
    
    // Add remaining text
    result += text.substring(lastIndex);
    
    if (result !== text) {
      //console.log('Changed:', { from: text, to: result });
      node.textContent = result;
    }
  }
}

// Message listener setup
browserAPI.runtime.onMessage.addListener((request, sender) => {
  console.log('Message received:', request); // Debug Point 13
  if (request.type === 'updateMappings') {
    try {
      console.log('Processing updateMappings message'); // Debug Point 14
      const normalizedMappings = {};
      Object.entries(request.mappings).forEach(([key, value]) => {
        normalizedMappings[key.toLowerCase()] = value;
      });
      
      wordMappings = normalizedMappings;
      wordExceptions = request.exceptions;
      replaceWords();
      return Promise.resolve({ status: 'success' });
    } catch (error) {
      console.error('Error handling message:', error);
      return Promise.reject(error);
    }
  }
  return Promise.resolve({ status: 'unknown_message' });
});

// Setup and initialization
console.log('Document readyState:', document.readyState); // Debug Point 15

if (document.readyState === 'loading') {
  console.log('Adding DOMContentLoaded listener for initialization'); // Debug Point 16
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - starting initialization'); // Debug Point 17
    initializeExtension();
  });
} else {
  console.log('Document already loaded - initializing immediately'); // Debug Point 18
  initializeExtension();
}

// For debugging browser API availability
console.log('browser API available:', typeof browser !== 'undefined'); // Debug Point 19
console.log('chrome API available:', typeof chrome !== 'undefined'); // Debug Point 20