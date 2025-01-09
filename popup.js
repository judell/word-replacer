document.addEventListener('DOMContentLoaded', async () => {
  const mappingsDiv = document.getElementById('mappings');
  const exceptionsDiv = document.getElementById('exceptions');
  
  // Load existing mappings and exceptions using unified API
  const data = await browserAPI.storage.local.get(['wordMappings', 'wordExceptions']);
  const mappings = data.wordMappings || {};
  for (const [original, replacement] of Object.entries(mappings)) {
    addMappingInputs(original, replacement);
  }

  const exceptions = data.wordExceptions || [];
  for (const exception of exceptions) {
    addExceptionInput(exception);
  }

  document.getElementById('addMapping').addEventListener('click', () => {
    addMappingInputs();
  });

  document.getElementById('addException').addEventListener('click', () => {
    addExceptionInput();
  });

  document.getElementById('save').addEventListener('click', async () => {
    try {
      const mappings = {};
      document.querySelectorAll('.mapping').forEach(div => {
        const original = div.querySelector('.original').value.trim();
        const replacement = div.querySelector('.replacement').value.trim();
        if (original && replacement) {
          mappings[original] = replacement;
        }
      });
  
      const exceptions = [];
      document.querySelectorAll('.exception').forEach(div => {
        const phrase = div.querySelector('.phrase').value.trim();
        if (phrase) {
          exceptions.push(phrase);
        }
      });
  
      // Save using unified API
      await browserAPI.storage.local.set({ 
        wordMappings: mappings,
        wordExceptions: exceptions
      });
    
      try {
        const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0].url;
        
        // Check for browser-specific protected URLs
        if (!currentUrl.startsWith('chrome://') && 
            !currentUrl.startsWith('edge://') && 
            !currentUrl.startsWith('about:') && 
            !currentUrl.startsWith('moz-extension://')) {
          
          await browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'updateMappings',
            mappings: mappings,
            exceptions: exceptions
          });
        }
      } catch (messageError) {
        console.log('Could not update active tab, but settings were saved:', messageError);
      }
  
      window.close();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
  });

  function addMappingInputs(original = '', replacement = '') {
    const div = document.createElement('div');
    div.className = 'mapping';
    div.innerHTML = `
      <div class="mapping-inputs">
        <input type="text" class="original" placeholder="Original word/phrase" value="${original}">
        <input type="text" class="replacement" placeholder="Replace with" value="${replacement}">
      </div>
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