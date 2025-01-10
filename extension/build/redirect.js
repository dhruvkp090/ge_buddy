console.log("Redirect page loaded");
const params = new URLSearchParams(window.location.search);
const type = params.get('type');
const originalUrl = params.get('url');
console.log("URL parameters:", { type, originalUrl });

const container = document.getElementById('container');
const message = document.getElementById('message');
const subMessage = document.getElementById('subMessage');
const purposeSelection = document.getElementById('purposeSelection');
const funBtn = document.getElementById('funBtn');
const workBtn = document.getElementById('workBtn');
const timer = document.getElementById('timer');
const continueBtn = document.getElementById('continueBtn');

let settings = {
  fun: {
    waitTime: 5,
    accessDuration: 5,
  },
  funAndWork: {
    fun: {
      waitTime: 5,
      accessDuration: 5,
    },
    work: {
      waitTime: 2,
      accessDuration: 30,
    },
  },
  socialMedia: {
    waitTime: 15,
    accessDuration: 5,
  },
};

let countdown = null;
let selectedPurpose = null;

// Load settings from storage
chrome.storage.local.get(['categorySettings'], (result) => {
  console.log("Loaded settings:", result.categorySettings);
  if (result.categorySettings) {
    // Merge with default settings to ensure all properties exist
    settings = {
      fun: {
        waitTime: 5,
        accessDuration: 5,
        ...result.categorySettings.fun
      },
      funAndWork: {
        fun: {
          waitTime: 5,
          accessDuration: 5,
          ...result.categorySettings.funAndWork?.fun
        },
        work: {
          waitTime: 2,
          accessDuration: 30,
          ...result.categorySettings.funAndWork?.work
        }
      },
      socialMedia: {
        waitTime: 15,
        accessDuration: 5,
        ...result.categorySettings.socialMedia
      }
    };
    console.log("Updated settings:", settings);
  } else {
    console.log("Using default settings:", settings);
  }
  setupPage();
});

function setupPage() {
  console.log("Setting up page for type:", type);
  if (type === 'fun') {
    console.log("Setting up fun mode");
    container.classList.add('fun-bg');
    message.textContent = 'STOP!';
    subMessage.textContent = 'This is a Fun Website';
    continueBtn.style.color = '#8b5cf6';
    startTimer(settings.fun.waitTime);
  } else if (type === 'funAndWork') {
    console.log("Setting up fun & work mode");
    container.classList.add('work-bg');
    message.textContent = 'WAIT!';
    subMessage.textContent = 'How do you plan to use this website?';
    purposeSelection.style.display = 'flex';
  } else if (type === 'socialMedia') {
    console.log("Setting up social media mode");
    container.classList.add('social-bg');
    message.textContent = 'FOCUS!';
    subMessage.textContent = 'This is a Social Media Website';
    continueBtn.style.color = '#f97316';
    selectedPurpose = 'social';
    const waitTime = settings.socialMedia.waitTime;
    console.log("Social media wait time:", waitTime);
    startTimer(waitTime);
  }
}

function startTimer(waitTime) {
  console.log("Starting timer with wait time:", waitTime);
  let timeLeft = parseInt(waitTime);
  console.log("Parsed timeLeft:", timeLeft);
  
  // If timeLeft is NaN, use default social media wait time
  if (isNaN(timeLeft)) {
    console.log("Invalid wait time, using default");
    timeLeft = settings.socialMedia.waitTime || 15; // Fallback to 15 seconds if settings not loaded
  }
  
  continueBtn.disabled = true;
  continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
  continueBtn.style.display = 'block';
  
  if (countdown) {
    clearInterval(countdown);
  }
  
  // Initial display
  timer.textContent = `You can continue in ${timeLeft} seconds`;
  
  countdown = setInterval(() => {
    timeLeft--;
    console.log("Timer tick:", timeLeft);
    
    if (timeLeft <= 0) {
      clearInterval(countdown);
      timer.textContent = 'You can continue now';
      continueBtn.disabled = false;
      continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      return;
    }
    
    timer.textContent = `You can continue in ${timeLeft} seconds`;
  }, 1000);
}

// Handle purpose selection for fun & work websites
funBtn.onclick = () => {
  selectedPurpose = 'fun';
  purposeSelection.style.display = 'none';
  continueBtn.style.display = 'block';
  continueBtn.style.color = '#8b5cf6';
  startTimer(settings.funAndWork.fun.waitTime);
};

workBtn.onclick = () => {
  selectedPurpose = 'work';
  purposeSelection.style.display = 'none';
  continueBtn.style.display = 'block';
  continueBtn.style.color = '#14b8a6';
  startTimer(settings.funAndWork.work.waitTime);
};

continueBtn.textContent = 'Continue to Website';
continueBtn.onclick = () => {
  if (continueBtn.disabled) return;
  
  console.log("Continue button clicked");
  if (originalUrl) {
    // Request temporary allowance before redirecting
    chrome.runtime.sendMessage(
      { 
        type: 'ALLOW_TEMPORARILY', 
        url: originalUrl,
        purpose: selectedPurpose || 'fun',
      },
      (response) => {
        console.log("Allowance response:", response);
        if (response && response.success) {
          console.log("Temporary allowance granted, redirecting to:", originalUrl);
          // Use chrome.tabs.update for more reliable navigation
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.update(tabs[0].id, { url: originalUrl });
            } else {
              // Fallback to window.location if tab update fails
              window.location.href = originalUrl;
            }
          });
        } else {
          console.error("Failed to get temporary allowance");
          timer.textContent = 'Error occurred. Please try again.';
        }
      }
    );
  }
};

// Cleanup on page unload
window.addEventListener('unload', () => {
  if (countdown) {
    clearInterval(countdown);
  }
}); 