document.addEventListener('DOMContentLoaded', () => {
  const mappingsDiv = document.getElementById('mappings');
  
  // Load existing mappings
  chrome.storage.local.get('wordMappings', (data) => {
    const mappings = data.wordMappings || {};
    for (const [original, replacement] of Object.entries(mappings)) {
      addMappingInputs(original, replacement);
    }
  });

  // Add new mapping button
  document.getElementById('addMapping').addEventListener('click', () => {
    addMappingInputs();
  });

  // Save button
  document.getElementById('save').addEventListener('click', async () => {
    const mappings = {};
    document.querySelectorAll('.mapping').forEach(div => {
      const original = div.querySelector('.original').value.trim();
      const replacement = div.querySelector('.replacement').value.trim();
      if (original && replacement) {
        mappings[original] = replacement;
      }
    });

    await chrome.storage.local.set({ wordMappings: mappings });
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    await chrome.tabs.sendMessage(tab.id, {
      type: 'updateMappings',
      mappings: mappings
    });
    
    window.close();
  });

  function addMappingInputs(original = '', replacement = '') {
    const div = document.createElement('div');
    div.className = 'mapping';
    div.innerHTML = `
      <input type="text" class="original" placeholder="Musk" value="${original}">
      <input type="text" class="replacement" placeholder="Asshole" value="${replacement}">
      <button class="remove">Remove</button>
    `;
    
    div.querySelector('.remove').addEventListener('click', () => {
      div.remove();
    });
    
    mappingsDiv.appendChild(div);
  }
});