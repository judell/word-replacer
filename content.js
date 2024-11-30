// content.js
let wordMappings = {};

// console.log('Content script loaded');

// Load word mappings from storage
chrome.storage.local.get('wordMappings', (data) => {
  // console.log('Initial storage data:', data);
  if (data.wordMappings) {
    wordMappings = data.wordMappings;
   // console.log('Loaded mappings:', wordMappings);
    replaceWords();
  } else {
   // console.log('No initial mappings found in storage');
  }
});

function replaceWords() {
  // console.log('Starting word replacement with mappings:', wordMappings);
  
  const textNodes = document.evaluate(
    '//text()[not(ancestor::script)][not(ancestor::style)]',
    document,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  // console.log('Found text nodes:', textNodes.snapshotLength);

  for (let i = 0; i < textNodes.snapshotLength; i++) {
    let node = textNodes.snapshotItem(i);
    let originalText = node.textContent;
    let text = originalText;

    for (const [original, replacement] of Object.entries(wordMappings)) {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
       // console.log(`Found "${original}" in text:`, matches.length, 'times');
        text = text.replace(regex, replacement);
      }
    }

    if (text !== originalText) {
      // console.log('Text changed from:', originalText);
      // console.log('To:', text);
      node.textContent = text;
    }
  }
  // console.log('Word replacement complete');
}

// Listen for changes in word mappings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log('Message received:', request);
  
  if (request.type === 'updateMappings') {
    // console.log('Updating mappings to:', request.mappings);
    wordMappings = request.mappings;
    replaceWords();
    sendResponse({status: 'success'});
  }
  return true;
});

// Add a mutation observer to handle dynamic content
const observer = new MutationObserver((mutations) => {
  // console.log('DOM mutation detected:', mutations.length, 'changes');
  replaceWords();
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// console.log('Mutation observer set up');