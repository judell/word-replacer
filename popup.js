document.addEventListener('DOMContentLoaded', () => {
  const mappingsDiv = document.getElementById('mappings');
  const exceptionsDiv = document.getElementById('exceptions');
  
  // Load existing mappings and exceptions
  chrome.storage.local.get(['wordMappings', 'wordExceptions'], (data) => {
    const mappings = data.wordMappings || {};
    for (const [original, replacement] of Object.entries(mappings)) {
      addMappingInputs(original, replacement);
    }

    const exceptions = data.wordExceptions || [];
    for (const exception of exceptions) {
      addExceptionInput(exception);
    }
  });

  document.getElementById('addMapping').addEventListener('click', () => {
    addMappingInputs();
  });

  document.getElementById('addException').addEventListener('click', () => {
    addExceptionInput();
  });

  document.getElementById('save').addEventListener('click', async () => {
    try {
      // Gather mappings
      const mappings = {};
      document.querySelectorAll('.mapping').forEach(div => {
        const original = div.querySelector('.original').value.trim();
        const replacement = div.querySelector('.replacement').value.trim();
        if (original && replacement) {
          mappings[original] = replacement;
        }
      });

      // Gather exceptions
      const exceptions = [];
      document.querySelectorAll('.exception').forEach(div => {
        const phrase = div.querySelector('.phrase').value.trim();
        if (phrase) {
          exceptions.push(phrase);
        }
      });

      // Save to storage first
      await chrome.storage.local.set({ 
        wordMappings: mappings,
        wordExceptions: exceptions
      });
    
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
      // Send message and wait for response before closing
      await chrome.tabs.sendMessage(tab.id, {
        type: 'updateMappings',
        mappings: mappings,
        exceptions: exceptions
      });

      // Only close after we've confirmed the message was sent
      window.close();
    } catch (error) {
      console.error('Error saving settings:', error);
      // Optionally show error to user
      alert('Error saving settings. Please try again.');
    }
  });

  function addMappingInputs(original = '', replacement = '') {
    const div = document.createElement('div');
    div.className = 'mapping';
    div.innerHTML = `
      <input type="text" class="original" placeholder="Original word" value="${original}">
      <input type="text" class="replacement" placeholder="Replace with" value="${replacement}">
      <button class="remove">Remove</button>
    `;
    
    div.querySelector('.remove').addEventListener('click', () => {
      div.remove();
    });
    
    mappingsDiv.appendChild(div);
  }

  function addExceptionInput(phrase = '') {
    const div = document.createElement('div');
    div.className = 'exception';
    div.innerHTML = `
      <input type="text" class="phrase" placeholder="Don't replace this phrase" value="${phrase}">
      <button class="remove">Remove</button>
    `;
    
    div.querySelector('.remove').addEventListener('click', () => {
      div.remove();
    });
    
    exceptionsDiv.appendChild(div);
  }
});