let wordMappings;  // Could be undefined (not in storage), null, or an object 
let wordExceptions; // Could be undefined (from v1.0), null, or an arraylet wordMappings = {};

chrome.storage.local.get(['wordMappings', 'wordExceptions'], (data) => {
  wordMappings = data.wordMappings || {};
  wordExceptions = data.wordExceptions || [];
  replaceWords();
});

chrome.storage.local.get(['wordMappings', 'wordExceptions'], (data) => {
  console.log('Initial load:', { 
    mappings: data.wordMappings || {},
    exceptions: data.wordExceptions || []
  });
  
  replaceWords();
});

function replaceWords() {
  const textNodes = document.evaluate(
    '//text()[not(ancestor::script)][not(ancestor::style)]',
    document,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

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
        // Only add if it doesn't overlap with an exception
        const overlapsException = matches.some(m => 
          m.isException && 
          ((match.index >= m.start && match.index < m.end) ||
           (match.index + match[0].length > m.start && match.index + match[0].length <= m.end))
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
        result += wordMappings[match.text] || wordMappings[match.text.toLowerCase()] || match.text;
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updateMappings') {
    console.log('Received update:', {
      mappings: request.mappings,
      exceptions: request.exceptions
    });
    
    wordMappings = request.mappings;
    wordExceptions = request.exceptions;
    replaceWords();
    sendResponse({status: 'success'});
  }
  return true;
});

const observer = new MutationObserver(replaceWords);
observer.observe(document.body, { childList: true, subtree: true });